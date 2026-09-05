import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatQty } from "@/lib/recipes";
import { weekDates } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const dates = weekDates();
  const slots = await prisma.mealSlot.findMany({
    where: { userId: user.id, date: { in: dates } },
    include: { recipe: { include: { ingredients: true } } },
  });
  if (!slots.length) {
    return NextResponse.json({ error: "Plan a recipe this week first." }, { status: 400 });
  }

  let added = 0;
  for (const slot of slots) {
    for (const item of slot.recipe.ingredients) {
      const quantity = Number(formatQty(item.quantity));
      const existing = await prisma.groceryItem.findFirst({
        where: {
          userId: user.id,
          done: false,
          name: item.name,
          unit: item.unit,
          aisle: item.aisle,
        },
      });
      if (existing) {
        await prisma.groceryItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      } else {
        await prisma.groceryItem.create({
          data: {
            userId: user.id,
            name: item.name,
            quantity,
            unit: item.unit,
            aisle: item.aisle,
            recipeTitle: slot.recipe.title,
          },
        });
      }
      added += 1;
    }
  }
  return NextResponse.json({ added });
}
