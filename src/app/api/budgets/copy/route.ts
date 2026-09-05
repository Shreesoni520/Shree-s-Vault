import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { monthKey, shiftMonth } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const month = new URL(request.url).searchParams.get("month") || monthKey();
  const previous = shiftMonth(month, -1);
  const previousBudgets = await prisma.budget.findMany({
    where: { userId: user.id, month: previous },
  });
  if (!previousBudgets.length) {
    return NextResponse.json({ error: "No envelopes in the previous month to copy." }, { status: 404 });
  }

  let copied = 0;
  for (const budget of previousBudgets) {
    const existing = await prisma.budget.findFirst({
      where: { userId: user.id, month, categoryId: budget.categoryId },
    });
    if (existing) {
      await prisma.budget.update({ where: { id: existing.id }, data: { amountCents: budget.amountCents } });
    } else {
      await prisma.budget.create({
        data: {
          userId: user.id,
          month,
          categoryId: budget.categoryId,
          amountCents: budget.amountCents,
        },
      });
    }
    copied += 1;
  }
  return NextResponse.json({ copied });
}
