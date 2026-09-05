import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { APP_FILE_SLUG } from "@/lib/brand";
import { centsToPounds, monthKey, todayKey } from "@/lib/money";
import { withBalances } from "@/lib/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "ledger";
  const month = url.searchParams.get("month") || "";

  if (kind === "grocery") {
    const items = await prisma.groceryItem.findMany({
      where: { userId: user.id },
      orderBy: [{ done: "asc" }, { name: "asc" }],
    });
    const csv = toCsv(
      ["name", "price", "bought"],
      items.map((item) => [item.name, centsToPounds(item.estimateCents).toFixed(2), item.done ? "yes" : "no"])
    );
    return file(csv, `${APP_FILE_SLUG}-grocery-${todayKey()}.csv`);
  }

  if (kind === "accounts") {
    const [accounts, transactions, goals] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "asc" } }),
      prisma.transaction.findMany({ where: { userId: user.id } }),
      prisma.goal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    ]);
    const rows = withBalances(accounts, transactions);
    const csv = toCsv(
      ["type", "name", "opening", "balance", "target", "saved", "deadline"],
      [
        ...rows.map((row) => [
          "account",
          row.name,
          centsToPounds(row.openingCents).toFixed(2),
          centsToPounds(row.balanceCents).toFixed(2),
          "",
          "",
          "",
        ]),
        ...goals.map((row) => [
          "goal",
          row.name,
          "",
          "",
          centsToPounds(row.targetCents).toFixed(2),
          centsToPounds(row.savedCents).toFixed(2),
          row.deadline,
        ]),
      ]
    );
    return file(csv, `${APP_FILE_SLUG}-accounts-${todayKey()}.csv`);
  }

  const where = {
    userId: user.id,
    ...(month && /^\d{4}-\d{2}$/.test(month) ? { date: { startsWith: month } } : {}),
  };
  const rows = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true, toAccount: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const csv = toCsv(
    ["date", "amount", "kind", "category", "account", "merchant", "note", "recurring"],
    rows.map((row) => [
      row.date,
      centsToPounds(row.amountCents).toFixed(2),
      row.kind,
      row.category?.name ?? "",
      row.kind === "transfer"
        ? `${row.account?.name ?? ""} → ${row.toAccount?.name ?? ""}`
        : (row.account?.name ?? ""),
      row.merchant,
      row.note,
      row.recurring ? "yes" : "no",
    ])
  );
  const stamp = month && /^\d{4}-\d{2}$/.test(month) ? month : `all-${monthKey()}`;
  return file(csv, `${APP_FILE_SLUG}-ledger-${stamp}.csv`);
}

function file(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
