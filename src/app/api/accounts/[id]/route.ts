import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureEverydayAccount, statementForAccount } from "@/lib/accounts";
import { poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  await ensureEverydayAccount(user.id);
  const account = await prisma.account.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, OR: [{ accountId: id }, { toAccountId: id }] },
    include: { category: true, account: true, toAccount: true },
  });
  const statement = statementForAccount(account, transactions);
  return NextResponse.json({
    account: { ...account, balanceCents: statement.balanceCents },
    openingCents: statement.openingCents,
    lines: statement.lines,
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.account.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Pot not found." }, { status: 404 });

  let body: { name?: string; type?: string; opening?: string | number; archived?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const openingCents =
    body.opening === undefined ? existing.openingCents : poundsToCents(body.opening) ?? existing.openingCents;
  const account = await prisma.account.update({
    where: { id },
    data: {
      name: (body.name ?? existing.name).trim().slice(0, 32) || existing.name,
      type: ["current", "savings", "cash"].includes(body.type ?? "") ? body.type! : existing.type,
      openingCents,
      archived: body.archived === undefined ? existing.archived : Boolean(body.archived),
    },
  });
  return NextResponse.json({ account });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.account.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Pot not found." }, { status: 404 });
  const count = await prisma.account.count({ where: { userId: user.id, archived: false } });
  if (!existing.archived && count <= 1) {
    return NextResponse.json({ error: "Keep at least one pot." }, { status: 400 });
  }
  const fallback = await ensureEverydayAccount(user.id);
  const nextId = fallback.id === id
    ? (await prisma.account.findFirst({ where: { userId: user.id, id: { not: id } } }))?.id
    : fallback.id;
  if (nextId) {
    await prisma.transaction.updateMany({ where: { userId: user.id, accountId: id }, data: { accountId: nextId } });
    await prisma.transaction.updateMany({ where: { userId: user.id, toAccountId: id }, data: { toAccountId: nextId } });
  }
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
