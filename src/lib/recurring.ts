import { prisma } from "@/lib/db";
import { dateInMonth } from "@/lib/money";

export function recurringKey(row: {
  merchant: string;
  amountCents: number;
  kind: string;
  categoryId: string | null;
  note: string;
}) {
  return [row.kind, row.amountCents, row.categoryId ?? "", row.merchant.trim().toLowerCase(), row.note.trim().toLowerCase()].join("|");
}

/** One rent / pay / bill per month — never weekly. */
export function monthlyBillKey(row: { kind: string; merchant: string }) {
  return `${row.kind}|${row.merchant.trim().toLowerCase()}`;
}

export async function ensureRecurringForMonth(userId: string, month: string) {
  const templates = await prisma.transaction.findMany({
    where: { userId, recurring: true },
    orderBy: { date: "desc" },
  });

  const seen = new Set<string>();
  const unique = [];
  for (const row of templates) {
    const key = monthlyBillKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  const existing = await prisma.transaction.findMany({
    where: { userId, date: { startsWith: month } },
  });
  const existingKeys = new Set(existing.map((row) => recurringKey(row)));
  const existingBills = new Set(existing.map((row) => monthlyBillKey(row)));

  let posted = 0;
  for (const row of unique) {
    if (existingKeys.has(recurringKey(row))) continue;
    if (existingBills.has(monthlyBillKey(row))) continue;
    await prisma.transaction.create({
      data: {
        userId,
        categoryId: row.categoryId,
        accountId: row.accountId,
        toAccountId: row.toAccountId,
        amountCents: row.amountCents,
        kind: row.kind,
        date: dateInMonth(row.date, month),
        note: row.note,
        merchant: row.merchant,
        recurring: true,
      },
    });
    posted += 1;
  }
  return posted;
}
