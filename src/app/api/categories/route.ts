import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: { name?: string; kind?: string; color?: string };
  try {
    body = (await request.json()) as { name?: string; kind?: string; color?: string };
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const kind = body.kind === "income" ? "income" : "expense";
  const color = body.color?.trim() || "#c9a36a";
  if (name.length < 1 || name.length > 32) {
    return NextResponse.json({ error: "Category name should be 1-32 characters." }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: { userId: user.id, name, kind, color },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "That category already exists." }, { status: 409 });
  }
}
