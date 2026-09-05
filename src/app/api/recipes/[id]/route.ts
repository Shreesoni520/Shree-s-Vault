import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.recipe.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  let body: {
    title?: string;
    servings?: number;
    minutes?: number;
    notes?: string;
    tags?: string;
    sourceUrl?: string;
    favorite?: boolean;
    ingredients?: { name: string; quantity: number; unit?: string; aisle?: string }[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const title = (body.title ?? existing.title).trim();
  const servings = Math.max(1, Math.min(99, Number(body.servings) || existing.servings));
  const minutes = Math.max(1, Math.min(600, Number(body.minutes) || existing.minutes));
  const replaceIngredients = Array.isArray(body.ingredients);

  const recipe = await prisma.$transaction(async (tx) => {
    if (replaceIngredients) {
      await tx.ingredient.deleteMany({ where: { recipeId: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        title,
        servings,
        minutes,
        notes: (body.notes ?? existing.notes).trim().slice(0, 2000),
        tags: (body.tags ?? existing.tags).trim().slice(0, 120),
        sourceUrl: (body.sourceUrl ?? existing.sourceUrl).trim().slice(0, 200),
        favorite: body.favorite === undefined ? existing.favorite : Boolean(body.favorite),
        ...(replaceIngredients
          ? {
              ingredients: {
                create: (body.ingredients ?? [])
                  .filter((item) => item.name?.trim())
                  .map((item, index) => ({
                    name: item.name.trim().slice(0, 80),
                    quantity: Number(item.quantity) || 1,
                    unit: (item.unit ?? "").trim().slice(0, 16),
                    aisle: (item.aisle ?? "Other").trim().slice(0, 24) || "Other",
                    sortOrder: index,
                  })),
              },
            }
          : {}),
      },
      include: { ingredients: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json({ recipe });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.recipe.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
