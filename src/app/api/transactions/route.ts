import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseAmount, parseKind, resolveAccounts } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const kind = url.searchParams.get("kind");
  const categoryId = url.searchParams.get("categoryId");
  const accountId = url.searchParams.get("accountId");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(month ? { date: { startsWith: month } } : {}),
      ...(kind === "income" || kind === "expense" || kind === "transfer" ? { kind } : {}),
      ...(categoryId === "none" ? { categoryId: null } : categoryId ? { categoryId } : {}),
      ...(accountId
        ? { OR: [{ accountId }, { toAccountId: accountId }] }
        : {}),
    },
    include: { category: true, account: true, toAccount: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const filtered = q
    ? transactions.filter((row) =>
        `${row.note} ${row.merchant} ${row.category?.name ?? ""} ${row.account?.name ?? ""}`.toLowerCase().includes(q)
      )
    : transactions;

  return NextResponse.json({ transactions: filtered });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: {
    amount?: string | number;
    kind?: string;
    date?: string;
    note?: string;
    merchant?: string;
    categoryId?: string | null;
    recurring?: boolean;
    accountId?: string | null;
    toAccountId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const amountCents = parseAmount(body.amount);
  if (amountCents === null || amountCents <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  const kind = parseKind(body.kind);
  const date = body.date?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Use a date like 2026-09-01." }, { status: 400 });
  }

  const accounts = await resolveAccounts(user.id, kind, body.accountId, body.toAccountId);
  if ("error" in accounts) return NextResponse.json({ error: accounts.error }, { status: 400 });

  let categoryId = kind === "transfer" ? null : body.categoryId || null;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } });
    if (!category) categoryId = null;
    else if (category.kind !== kind) {
      return NextResponse.json({ error: "That category does not match income/spend." }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      categoryId,
      accountId: accounts.accountId,
      toAccountId: accounts.toAccountId,
      amountCents,
      kind,
      date,
      note: (body.note ?? "").trim().slice(0, 160),
      merchant: kind === "transfer" ? "Move" : (body.merchant ?? "").trim().slice(0, 80),
      recurring: Boolean(body.recurring),
    },
    include: { category: true, account: true, toAccount: true },
  });
  return NextResponse.json({ transaction });
}
