import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { monthKey, poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const month = new URL(request.url).searchParams.get("month") || monthKey();
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, month },
    include: { category: true },
  });
  return NextResponse.json({ budgets, month });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: { month?: string; categoryId?: string | null; amount?: string | number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const month = body.month?.trim() || monthKey();
  const amountCents = poundsToCents(body.amount ?? "");
  if (amountCents === null || amountCents < 0) {
    return NextResponse.json({ error: "Enter a valid budget amount." }, { status: 400 });
  }
  let categoryId = body.categoryId || null;
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id, kind: "expense" },
    });
    if (!category) return NextResponse.json({ error: "Pick an expense category." }, { status: 400 });
  }

  const existing = await prisma.budget.findFirst({
    where: { userId: user.id, month, categoryId },
  });
  const budget = existing
    ? await prisma.budget.update({
        where: { id: existing.id },
        data: { amountCents },
        include: { category: true },
      })
    : await prisma.budget.create({
        data: { userId: user.id, categoryId, month, amountCents },
        include: { category: true },
      });
  return NextResponse.json({ budget });
}
