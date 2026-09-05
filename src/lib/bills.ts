import { prisma } from "@/lib/db";
import { poundsToCents, todayKey } from "@/lib/money";
import { EXAMPLE_MERCHANTS, HOUSEHOLD_BILLS } from "@/lib/household";
import { ensureEverydayAccount } from "@/lib/accounts";

export async function clearExampleActivity(userId: string) {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    select: { id: true, merchant: true, note: true },
  });
  const ids = rows
    .filter((row) => {
      const name = row.merchant.trim().toLowerCase();
      return (
        EXAMPLE_MERCHANTS.includes(name) ||
        row.note === "Starter sample — delete any time" ||
        row.note === "Sample shop"
      );
    })
    .map((row) => row.id);
  if (ids.length) {
    await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
  }
  return ids.length;
}

export async function upsertHouseholdBills(userId: string, amounts: Partial<Record<string, string | number>>) {
  const everyday = await ensureEverydayAccount(userId);
  let saved = 0;
  for (const bill of HOUSEHOLD_BILLS) {
    const cents = Math.max(0, poundsToCents(amounts[bill.key] ?? 0) ?? 0);
    const category = await prisma.category.findFirst({ where: { userId, name: bill.category } });
    const existing = await prisma.transaction.findMany({
      where: { userId, merchant: bill.merchant, kind: "expense", recurring: true },
    });
    if (cents <= 0) {
      if (existing.length) {
        await prisma.transaction.deleteMany({
          where: { userId, merchant: bill.merchant, kind: "expense", recurring: true },
        });
      }
      continue;
    }
    if (existing[0]) {
      await prisma.transaction.updateMany({
        where: { userId, merchant: bill.merchant, kind: "expense", recurring: true },
        data: { amountCents: cents, categoryId: category?.id, accountId: everyday.id },
      });
    } else {
      await prisma.transaction.create({
        data: {
          userId,
          accountId: everyday.id,
          categoryId: category?.id,
          amountCents: cents,
          kind: "expense",
          date: todayKey(),
          merchant: bill.merchant,
          note: "Household bill from setup",
          recurring: true,
        },
      });
    }
    saved += 1;
  }
  return saved;
}
