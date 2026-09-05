import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { weekDates } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const dates = weekDates();
  const slots = await prisma.mealSlot.findMany({
    where: { userId: user.id, date: { in: dates } },
    include: { recipe: { include: { ingredients: { orderBy: { sortOrder: "asc" } } } } },
  });
  return NextResponse.json({ dates, slots });
}

export async function PUT(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: { date?: string; recipeId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }
  const date = body.date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a day this week." }, { status: 400 });
  }

  if (!body.recipeId) {
    await prisma.mealSlot.deleteMany({ where: { userId: user.id, date } });
    return NextResponse.json({ ok: true });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id: body.recipeId, userId: user.id } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const slot = await prisma.mealSlot.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, recipeId: recipe.id },
    update: { recipeId: recipe.id },
    include: { recipe: true },
  });
  return NextResponse.json({ slot });
}
