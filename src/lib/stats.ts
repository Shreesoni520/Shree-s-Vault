import type { Category, Transaction } from "@prisma/client";
import { lastNMonths, monthKey } from "@/lib/money";

export type Tx = Transaction & { category: Category | null };

export function inMonth(date: string, month: string) {
  return date.startsWith(month);
}

export function sumCents(items: { amountCents: number }[]) {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

export function incomeOf(items: Tx[]) {
  return sumCents(items.filter((item) => item.kind === "income"));
}

export function spendOf(items: Tx[]) {
  return sumCents(items.filter((item) => item.kind === "expense"));
}

export function cashflowOf(items: Tx[]) {
  return incomeOf(items) - spendOf(items);
}

export function categoryTotals(items: Tx[], kind: "income" | "expense") {
  const map = new Map<string, { name: string; color: string; cents: number }>();
  for (const item of items.filter((row) => row.kind === kind)) {
    const name = item.category?.name ?? "Uncategorised";
    const color = item.category?.color ?? "#8d8a7a";
    const current = map.get(name) ?? { name, color, cents: 0 };
    current.cents += item.amountCents;
    map.set(name, current);
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents);
}

export function monthlySeries(items: Tx[], months = 6, from = monthKey()) {
  const keys = lastNMonths(months, from);
  return keys.map((month) => {
    const rows = items.filter((item) => inMonth(item.date, month));
    return {
      month,
      income: incomeOf(rows),
      spend: spendOf(rows),
    };
  });
}

export function currentMonthInsight(items: Tx[]) {
  const month = monthKey();
  const current = items.filter((item) => inMonth(item.date, month));
  const previous = items.filter((item) => inMonth(item.date, lastNMonths(2)[0]));
  const spend = spendOf(current);
  const income = incomeOf(current);
  const lastSpend = spendOf(previous);
  const top = categoryTotals(current, "expense")[0];
  const saved = income - spend;
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const delta = lastSpend ? Math.round(((spend - lastSpend) / lastSpend) * 100) : null;
  return { month, spend, income, saved, rate, top, delta };
}
