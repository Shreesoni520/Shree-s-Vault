import { prisma } from "@/lib/db";
import { poundsToCents } from "@/lib/money";
import { ensureEverydayAccount } from "@/lib/accounts";

export function parseKind(value: string | undefined, fallback = "expense") {
  if (value === "income" || value === "expense" || value === "transfer") return value;
  return fallback;
}

export async function resolveAccounts(
  userId: string,
  kind: string,
  accountId: string | null | undefined,
  toAccountId: string | null | undefined
) {
  const everyday = await ensureEverydayAccount(userId);
  const accounts = await prisma.account.findMany({ where: { userId, archived: false } });
  const from = accounts.find((row) => row.id === accountId) ?? everyday;
  if (kind !== "transfer") {
    return { accountId: from.id, toAccountId: null as string | null };
  }
  const to = accounts.find((row) => row.id === toAccountId);
  if (!to || to.id === from.id) {
    return { error: "Pick two different pots to move money between." as const };
  }
  return { accountId: from.id, toAccountId: to.id };
}

export function parseAmount(value: string | number | undefined) {
  return poundsToCents(value ?? "");
}
