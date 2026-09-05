import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.groceryItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  let body: { done?: boolean; estimateCents?: number };
  try {
    body = (await request.json()) as { done?: boolean };
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const item = await prisma.groceryItem.update({
    where: { id },
    data: {
      ...(body.done === undefined ? {} : { done: Boolean(body.done) }),
      ...(body.estimateCents === undefined ? {} : { estimateCents: Math.max(0, Math.round(Number(body.estimateCents) || 0)) }),
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.groceryItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  await prisma.groceryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
