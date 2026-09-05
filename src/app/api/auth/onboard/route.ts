import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicUser, requireUser } from "@/lib/auth";
import { isCurrency } from "@/lib/currency";
import { poundsToCents, todayKey } from "@/lib/money";
import { clearExampleActivity, upsertHouseholdBills } from "@/lib/bills";
import { ensureEverydayAccount } from "@/lib/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: {
    currency?: string;
    salary?: string | number;
    leftoverGoal?: string | number;
    opening?: string | number;
    displayName?: string;
    rent?: string | number;
    light?: string | number;
    water?: string | number;
    internet?: string | number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  if (!isCurrency(body.currency)) {
    return NextResponse.json({ error: "Pick a currency." }, { status: 400 });
  }

  const salaryCents = Math.max(0, poundsToCents(body.salary ?? 0) ?? 0);
  const leftoverGoalCents = Math.max(0, poundsToCents(body.leftoverGoal ?? 0) ?? 0);
  const openingCents = Math.max(0, poundsToCents(body.opening ?? 0) ?? 0);
  const displayName = body.displayName?.trim();

  await clearExampleActivity(user.id);
  await prisma.goal.deleteMany({
    where: { userId: user.id, name: "Emergency buffer", savedCents: 0 },
  });

  const everyday = await ensureEverydayAccount(user.id);
  await prisma.account.update({
    where: { id: everyday.id },
    data: { openingCents },
  });

  if (salaryCents > 0) {
    const pay = await prisma.category.findFirst({ where: { userId: user.id, name: "Pay" } });
    const existingPay = await prisma.transaction.findFirst({
      where: { userId: user.id, merchant: "Pay", recurring: true, kind: "income" },
    });
    if (!existingPay) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: everyday.id,
          categoryId: pay?.id,
          amountCents: salaryCents,
          kind: "income",
          date: todayKey(),
          merchant: "Pay",
          note: "Monthly pay from setup",
          recurring: true,
        },
      });
    } else {
      await prisma.transaction.update({
        where: { id: existingPay.id },
        data: { amountCents: salaryCents, accountId: everyday.id, categoryId: pay?.id ?? existingPay.categoryId },
      });
    }
  }

  if (leftoverGoalCents > 0) {
    const existingGoal = await prisma.goal.findFirst({ where: { userId: user.id, name: "Keep this month" } });
    if (!existingGoal) {
      await prisma.goal.create({
        data: { userId: user.id, name: "Keep this month", targetCents: leftoverGoalCents, savedCents: 0 },
      });
    } else {
      await prisma.goal.update({
        where: { id: existingGoal.id },
        data: { targetCents: leftoverGoalCents },
      });
    }
  }

  await upsertHouseholdBills(user.id, {
    rent: body.rent,
    light: body.light,
    water: body.water,
    internet: body.internet,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      currency: body.currency,
      salaryCents,
      leftoverGoalCents,
      onboarded: true,
      ...(displayName && displayName.length <= 40 ? { displayName } : {}),
    },
  });

  return NextResponse.json({ user: publicUser(updated) });
}
