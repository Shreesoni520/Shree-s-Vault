import type { Account, Transaction } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function ensureEverydayAccount(userId: string) {
  const existing = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  let everyday = existing.find((row) => !row.archived) ?? existing[0];
  if (!everyday) {
    everyday = await prisma.account.create({
      data: { userId, name: "Everyday", type: "current" },
    });
    await prisma.account.create({
      data: { userId, name: "Savings", type: "savings" },
    });
  }
  await prisma.transaction.updateMany({
    where: { userId, accountId: null, kind: { not: "transfer" } },
    data: { accountId: everyday.id },
  });
  return everyday;
}

export function accountBalance(account: Account, transactions: Transaction[]) {
  let cents = account.openingCents;
  for (const row of transactions) {
    if (row.kind === "income" && row.accountId === account.id) cents += row.amountCents;
    else if (row.kind === "expense" && row.accountId === account.id) cents -= row.amountCents;
    else if (row.kind === "transfer") {
      if (row.accountId === account.id) cents -= row.amountCents;
      if (row.toAccountId === account.id) cents += row.amountCents;
    }
  }
  return cents;
}

export function withBalances(accounts: Account[], transactions: Transaction[]) {
  return accounts.map((account) => ({
    ...account,
    balanceCents: accountBalance(account, transactions),
  }));
}

export function deltaForAccount(accountId: string, row: Transaction) {
  if (row.kind === "income" && row.accountId === accountId) return row.amountCents;
  if (row.kind === "expense" && row.accountId === accountId) return -row.amountCents;
  if (row.kind === "transfer") {
    if (row.accountId === accountId) return -row.amountCents;
    if (row.toAccountId === accountId) return row.amountCents;
  }
  return 0;
}

export function statementForAccount(account: Account, transactions: Transaction[]) {
  const rows = transactions
    .filter((row) => row.accountId === account.id || row.toAccountId === account.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || +new Date(a.createdAt) - +new Date(b.createdAt));
  let running = account.openingCents;
  const lines = rows.map((row) => {
    const deltaCents = deltaForAccount(account.id, row);
    running += deltaCents;
    return { ...row, deltaCents, balanceCents: running };
  });
  return { openingCents: account.openingCents, balanceCents: running, lines: lines.slice().reverse() };
}
