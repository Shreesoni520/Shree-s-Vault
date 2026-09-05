import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: { name?: string; target?: string | number; deadline?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 40);
  const targetCents = poundsToCents(body.target ?? "");
  if (name.length < 2) return NextResponse.json({ error: "Name this goal." }, { status: 400 });
  if (targetCents === null || targetCents <= 0) {
    return NextResponse.json({ error: "Set a target amount." }, { status: 400 });
  }
  const deadline = (body.deadline ?? "").trim();
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      name,
      targetCents,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : "",
    },
  });
  return NextResponse.json({ goal });
}
