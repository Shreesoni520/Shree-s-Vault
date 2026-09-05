import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  let body: { name?: string; target?: string | number; saved?: string | number; deadline?: string; delta?: string | number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const targetCents = body.target === undefined ? existing.targetCents : poundsToCents(body.target) ?? existing.targetCents;
  let savedCents = body.saved === undefined ? existing.savedCents : poundsToCents(body.saved) ?? existing.savedCents;
  if (body.delta !== undefined) {
    const delta = poundsToCents(body.delta) ?? 0;
    savedCents = Math.max(0, existing.savedCents + delta);
  }
  const deadline = body.deadline === undefined ? existing.deadline : body.deadline.trim();
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: (body.name ?? existing.name).trim().slice(0, 40) || existing.name,
      targetCents: Math.max(1, targetCents),
      savedCents: Math.max(0, savedCents),
      deadline: deadline === "" || /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : existing.deadline,
    },
  });
  return NextResponse.json({ goal });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await context.params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
