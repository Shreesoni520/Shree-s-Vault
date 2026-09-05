import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
