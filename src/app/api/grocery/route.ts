import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const items = await prisma.groceryItem.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { name: "asc" }, { createdAt: "asc" }],
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
    estimateCents?: number | string;
    price?: string | number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "Add an item name." }, { status: 400 });

  const estimateCents =
    body.estimateCents !== undefined
      ? Math.max(0, Math.round(Number(body.estimateCents) || 0))
      : Math.max(0, poundsToCents(body.price ?? 0) ?? 0);

  const existing = await prisma.groceryItem.findFirst({
    where: { userId: user.id, name: name.slice(0, 80), done: false },
  });
  if (existing) {
    const item = await prisma.groceryItem.update({
      where: { id: existing.id },
      data: {
        estimateCents: estimateCents || existing.estimateCents,
        quantity: 1,
        unit: "",
        aisle: "Monthly",
        recipeTitle: "",
      },
    });
    return NextResponse.json({ item });
  }

  const item = await prisma.groceryItem.create({
    data: {
      userId: user.id,
      name: name.slice(0, 80),
      quantity: 1,
      unit: "",
      aisle: "Monthly",
      recipeTitle: "",
      estimateCents,
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
