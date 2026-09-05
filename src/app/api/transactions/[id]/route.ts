import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseAmount, parseKind, resolveAccounts } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

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

  const amountCents = parseAmount(body.amount ?? existing.amountCents / 100);
  if (amountCents === null || amountCents <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  const kind = parseKind(body.kind, existing.kind);
  const date = body.date?.trim() || existing.date;
  const accounts = await resolveAccounts(
    user.id,
    kind,
    body.accountId === undefined ? existing.accountId : body.accountId,
    body.toAccountId === undefined ? existing.toAccountId : body.toAccountId
  );
  if ("error" in accounts) return NextResponse.json({ error: accounts.error }, { status: 400 });

  let categoryId = kind === "transfer" ? null : body.categoryId === undefined ? existing.categoryId : body.categoryId;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } });
    if (!category || category.kind !== kind) categoryId = null;
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      amountCents,
      kind,
      date,
      note: (body.note ?? existing.note).trim().slice(0, 160),
      merchant: kind === "transfer" ? "Move" : (body.merchant ?? existing.merchant).trim().slice(0, 80),
      categoryId,
      accountId: accounts.accountId,
      toAccountId: accounts.toAccountId,
      recurring: body.recurring === undefined ? existing.recurring : Boolean(body.recurring),
    },
    include: { category: true, account: true, toAccount: true },
  });
  return NextResponse.json({ transaction });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
