import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const [categories, transactions, budgets, recipes, groceryItems, mealSlots, accounts, goals] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.budget.findMany({ where: { userId: user.id } }),
    prisma.recipe.findMany({ where: { userId: user.id }, include: { ingredients: true } }),
    prisma.groceryItem.findMany({ where: { userId: user.id } }),
    prisma.mealSlot.findMany({ where: { userId: user.id } }),
    prisma.account.findMany({ where: { userId: user.id } }),
    prisma.goal.findMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: { username: user.username, displayName: user.displayName, leftoverGoalCents: user.leftoverGoalCents },
    categories,
    transactions,
    budgets,
    recipes,
    groceryItems,
    mealSlots,
    accounts,
    goals,
  });
}
