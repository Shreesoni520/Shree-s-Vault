import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

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

  const title = body.title?.trim() ?? "";
  if (title.length < 1 || title.length > 80) {
    return NextResponse.json({ error: "Give this recipe a name." }, { status: 400 });
  }
  const servings = Math.max(1, Math.min(99, Number(body.servings) || 2));
  const minutes = Math.max(1, Math.min(600, Number(body.minutes) || 30));
  const ingredients = (body.ingredients ?? []).filter((item) => item.name?.trim());

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title,
      servings,
      minutes,
      notes: (body.notes ?? "").trim().slice(0, 2000),
      tags: (body.tags ?? "").trim().slice(0, 120),
      sourceUrl: (body.sourceUrl ?? "").trim().slice(0, 200),
      ingredients: {
        create: ingredients.map((item, index) => ({
          name: item.name.trim().slice(0, 80),
          quantity: Number(item.quantity) || 1,
          unit: (item.unit ?? "").trim().slice(0, 16),
          aisle: (item.aisle ?? "Other").trim().slice(0, 24) || "Other",
          sortOrder: index,
        })),
      },
    },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ recipe });
}
