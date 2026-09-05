import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: `${existing.title} copy`,
      servings: existing.servings,
      minutes: existing.minutes,
      notes: existing.notes,
      tags: existing.tags,
      sourceUrl: existing.sourceUrl,
      favorite: false,
      ingredients: {
        create: existing.ingredients.map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          aisle: item.aisle,
          sortOrder: index,
        })),
      },
    },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ recipe });
}
