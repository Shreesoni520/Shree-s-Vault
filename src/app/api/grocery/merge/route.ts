import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const items = await prisma.groceryItem.findMany({
    where: { userId: user.id, done: false },
  });
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.name.trim().toLowerCase()}|${item.unit}|${item.aisle}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  let merged = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const [keep, ...rest] = rows;
    const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    await prisma.groceryItem.update({
      where: { id: keep.id },
      data: { quantity },
    });
    await prisma.groceryItem.deleteMany({ where: { id: { in: rest.map((row) => row.id) } } });
    merged += rest.length;
  }
  return NextResponse.json({ merged });
}
