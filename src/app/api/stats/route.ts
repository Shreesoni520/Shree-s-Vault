import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { daysElapsedInMonth, daysInMonth, formatMoney, lastNMonths, monthKey, monthShort, weekDates } from "@/lib/money";
import { categoryTotals, incomeOf, monthlySeries, spendOf, sumCents } from "@/lib/stats";
import { ensureEverydayAccount, withBalances } from "@/lib/accounts";
import { recurringKey } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const month = new URL(request.url).searchParams.get("month") || monthKey();
  const from = lastNMonths(6, month)[0];
  await ensureEverydayAccount(user.id);

  const [transactions, allTransactions, budgets, groceryCount, accounts, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: `${from}-01` } },
      include: { category: true, account: true, toAccount: true },
    }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.budget.findMany({
      where: { userId: user.id, month },
      include: { category: true },
    }),
    prisma.groceryItem.count({ where: { userId: user.id, done: false } }),
    prisma.account.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "asc" } }),
    prisma.goal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const thisMonth = transactions.filter((row) => row.date.startsWith(month));
  const income = incomeOf(thisMonth);
  const spend = spendOf(thisMonth);
  const saved = income - spend;
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const previousKey = lastNMonths(2, month)[0];
  const previousSpend = spendOf(transactions.filter((row) => row.date.startsWith(previousKey)));
  const spendDelta = previousSpend ? Math.round(((spend - previousSpend) / previousSpend) * 100) : null;

  const elapsed = daysElapsedInMonth(month);
  const length = daysInMonth(month);
  const dailySpend = Math.round(spend / elapsed);
  const projectedSpend = dailySpend * length;
  const remainingDays = Math.max(0, length - elapsed);

  const budgetRows = budgets.map((budget) => {
    const used = spendOf(
      thisMonth.filter((row) =>
        budget.categoryId ? row.categoryId === budget.categoryId : row.kind === "expense"
      )
    );
    return {
      ...budget,
      usedCents: budget.categoryId ? used : spend,
    };
  });

  const uncategorised = thisMonth.filter((row) => row.kind === "expense" && !row.categoryId).length;
  const eatingOut = thisMonth
    .filter((row) => row.kind === "expense" && row.category?.name === "Eating out")
    .reduce((sum, row) => sum + row.amountCents, 0);
  const overBudgets = budgetRows.filter((row) => (row.usedCents ?? 0) > row.amountCents);

  const templates = allTransactions.filter((row) => row.recurring);
  const seen = new Set<string>();
  const uniqueBills = [];
  for (const row of templates) {
    const key = recurringKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueBills.push(row);
  }
  const monthKeys = new Set(thisMonth.map((row) => recurringKey(row)));
  const bills = uniqueBills.map((row) => ({
    id: row.id,
    merchant: row.merchant || row.note || (row.kind === "income" ? "Income" : "Bill"),
    amountCents: row.amountCents,
    kind: row.kind,
    posted: monthKeys.has(recurringKey(row)),
    day: Number(row.date.slice(8, 10)) || 1,
  }));
  const billsDue = bills.filter((row) => !row.posted && row.kind === "expense").length;

  const week = new Set(weekDates());
  const thisWeek = allTransactions.filter((row) => week.has(row.date));
  const weekIncome = sumCents(thisWeek.filter((row) => row.kind === "income"));
  const weekSpend = sumCents(thisWeek.filter((row) => row.kind === "expense"));
  const accountRows = withBalances(accounts, allTransactions);
  const cash = accountRows.reduce((sum, row) => sum + row.balanceCents, 0);
  const potsSaved = goals.reduce((sum, row) => sum + row.savedCents, 0);

  const insights: { tone: "good" | "warn" | "info"; text: string }[] = [];
  if (uncategorised) insights.push({ tone: "warn", text: `${uncategorised} line${uncategorised === 1 ? "" : "s"} still need a category.` });
  if (overBudgets.length) insights.push({ tone: "warn", text: `${overBudgets.length} envelope${overBudgets.length === 1 ? " is" : "s are"} over this month.` });
  if (spendDelta !== null && spendDelta < 0) insights.push({ tone: "good", text: `Spend is ${Math.abs(spendDelta)}% lower than last month.` });
  if (spendDelta !== null && spendDelta > 8) insights.push({ tone: "warn", text: `Spend is ${spendDelta}% higher than last month.` });
  if (spend > 0 && eatingOut / spend >= 0.25) insights.push({ tone: "info", text: "Eating out is over a quarter of spend." });
  if (user.leftoverGoalCents && saved >= user.leftoverGoalCents) insights.push({ tone: "good", text: "You hit this month’s leftover goal." });
  if (user.leftoverGoalCents && saved < user.leftoverGoalCents) {
    insights.push({
      tone: "info",
      text: `${formatMoney(user.leftoverGoalCents - saved, user.currency)} still to keep for your leftover goal.`,
    });
  }
  if (projectedSpend > spend * 1.15 && spend > 0) {
    insights.push({
      tone: "info",
      text: `At this pace, spend lands around ${formatMoney(projectedSpend, user.currency)} this month.`,
    });
  }
  if (billsDue) insights.push({ tone: "warn", text: `${billsDue} repeating bill${billsDue === 1 ? "" : "s"} not posted yet.` });
  if (!insights.length) insights.push({ tone: "info", text: "Quiet month so far. Add lines as they happen." });

  return NextResponse.json({
    month,
    income,
    spend,
    saved,
    rate,
    spendDelta,
    leftoverGoalCents: user.leftoverGoalCents,
    uncategorised,
    dailySpend,
    projectedSpend,
    remainingDays,
    cash,
    potsSaved,
    weekIncome,
    weekSpend,
    topCategories: categoryTotals(thisMonth, "expense").slice(0, 6),
    series: monthlySeries(transactions, 6, month).map((row) => ({
      ...row,
      label: monthShort(row.month),
    })),
    budgets: budgetRows,
    accounts: accountRows,
    goals,
    bills,
    groceryCount,
    recent: thisMonth.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    insights,
    recurringTemplates: uniqueBills.length,
  });
}
