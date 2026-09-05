import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureEverydayAccount, withBalances } from "@/lib/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  await ensureEverydayAccount(user.id);
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ accounts: withBalances(accounts, transactions) });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: { name?: string; type?: string; opening?: string | number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 32);
  if (name.length < 2) return NextResponse.json({ error: "Give this pot a name." }, { status: 400 });
  const type = ["current", "savings", "cash"].includes(body.type ?? "") ? body.type! : "current";
  const openingCents = Math.round(Number(String(body.opening ?? 0).replace(/[£€$₹,\s]/g, "")) * 100) || 0;
  const account = await prisma.account.create({
    data: { userId: user.id, name, type, openingCents },
  });
  return NextResponse.json({ account: { ...account, balanceCents: openingCents } });
}
