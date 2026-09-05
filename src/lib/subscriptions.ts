import { prisma } from "@/lib/db";
import { monthKey, poundsToCents, todayKey } from "@/lib/money";
import { isHouseholdMerchant } from "@/lib/household";
import { ensureEverydayAccount } from "@/lib/accounts";
import { ensureRecurringForMonth } from "@/lib/recurring";

export const SUBSCRIPTION_NOTE = "Subscription — once a month";
export const SUBSCRIPTION_CATEGORY = "Subscriptions";

export function isReservedSubscriptionName(name: string) {
  const key = name.trim().toLowerCase();
  return !key || isHouseholdMerchant(key) || key === "pay";
}

export async function ensureSubscriptionCategory(userId: string) {
  const existing = await prisma.category.findFirst({
    where: { userId, name: SUBSCRIPTION_CATEGORY, kind: "expense" },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: { userId, name: SUBSCRIPTION_CATEGORY, kind: "expense", color: "#5b7c99" },
  });
}

export async function upsertSubscription(
  userId: string,
  input: { name: string; amount: string | number; previousName?: string }
) {
  const name = input.name.trim().slice(0, 40);
  if (!name) return { error: "Name the subscription." as const };
  if (isReservedSubscriptionName(name)) {
    return { error: "Use Household bills for rent, light, water, or internet." as const };
  }
  const cents = Math.max(0, poundsToCents(input.amount) ?? 0);
  if (cents <= 0) return { error: "Type the monthly amount." as const };

  const lookup = (input.previousName ?? name).trim();
  const everyday = await ensureEverydayAccount(userId);
  const category = await ensureSubscriptionCategory(userId);
  const existing = await prisma.transaction.findMany({
    where: {
      userId,
      kind: "expense",
      recurring: true,
      merchant: { equals: lookup, mode: "insensitive" },
    },
  });

  if (existing.length) {
    await prisma.transaction.updateMany({
      where: { id: { in: existing.map((row) => row.id) } },
      data: {
        merchant: name,
        amountCents: cents,
        categoryId: category.id,
        accountId: everyday.id,
        note: SUBSCRIPTION_NOTE,
      },
    });
  } else {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: everyday.id,
        categoryId: category.id,
        amountCents: cents,
        kind: "expense",
        date: todayKey(),
        merchant: name,
        note: SUBSCRIPTION_NOTE,
        recurring: true,
      },
    });
  }

  await ensureRecurringForMonth(userId, monthKey());
  return { ok: true as const, name, amountCents: cents };
}

export async function removeSubscription(userId: string, name: string) {
  const merchant = name.trim();
  if (!merchant) return { error: "Pick a subscription to remove." as const };
  if (isHouseholdMerchant(merchant)) {
    return { error: "That is a household bill. Change it under Household bills." as const };
  }
  const result = await prisma.transaction.deleteMany({
    where: {
      userId,
      kind: "expense",
      recurring: true,
      merchant: { equals: merchant, mode: "insensitive" },
    },
  });
  return { ok: true as const, removed: result.count };
}
