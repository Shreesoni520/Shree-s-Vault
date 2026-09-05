import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatQty, scaleQty } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const items = await prisma.groceryItem.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { aisle: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: {
    name?: string;
    quantity?: number;
    unit?: string;
    aisle?: string;
    recipeTitle?: string;
    estimateCents?: number;
    fromRecipeId?: string;
    ingredientIds?: string[];
    servings?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  if (body.fromRecipeId && body.ingredientIds?.length) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: body.fromRecipeId, userId: user.id },
      include: { ingredients: true },
    });
    if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    const servings = Math.max(1, Number(body.servings) || recipe.servings);
    const chosen = recipe.ingredients.filter((item) => body.ingredientIds?.includes(item.id));
    const created = [];
    for (const item of chosen) {
      const quantity = Number(formatQty(scaleQty(item.quantity, recipe.servings, servings)));
      const existing = await prisma.groceryItem.findFirst({
        where: { userId: user.id, done: false, name: item.name, unit: item.unit, aisle: item.aisle },
      });
      if (existing) {
        created.push(
          await prisma.groceryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantity },
          })
        );
      } else {
        created.push(
          await prisma.groceryItem.create({
            data: {
              userId: user.id,
              name: item.name,
              quantity,
              unit: item.unit,
              aisle: item.aisle,
              recipeTitle: recipe.title,
            },
          })
        );
      }
    }
    return NextResponse.json({ items: created });
  }

  const name = body.name?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "Add an item name." }, { status: 400 });
  const unit = (body.unit ?? "").trim().slice(0, 16);
  const aisle = (body.aisle ?? "Other").trim().slice(0, 24) || "Other";
  const quantity = Number(body.quantity) || 1;
  const existing = await prisma.groceryItem.findFirst({
    where: { userId: user.id, done: false, name: name.slice(0, 80), unit, aisle },
  });
  if (existing) {
    const item = await prisma.groceryItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
    return NextResponse.json({ item });
  }
  const item = await prisma.groceryItem.create({
    data: {
      userId: user.id,
      name: name.slice(0, 80),
      quantity,
      unit,
      aisle,
      recipeTitle: (body.recipeTitle ?? "").trim().slice(0, 80),
      estimateCents: Math.max(0, Number(body.estimateCents) || 0),
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE() {
  const { user, response } = await requireUser();
  if (!user) return response;
  await prisma.groceryItem.deleteMany({ where: { userId: user.id, done: true } });
  return NextResponse.json({ ok: true });
}
