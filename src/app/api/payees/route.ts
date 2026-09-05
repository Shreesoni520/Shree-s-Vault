import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const rows = await prisma.transaction.findMany({
    where: { userId: user.id, merchant: { not: "" }, kind: { not: "transfer" } },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 400,
  });
  const seen = new Map<
    string,
    { name: string; lastCents: number; kind: string; categoryId: string | null; category: { name: string; color: string } | null; count: number }
  >();
  for (const row of rows) {
    const name = row.merchant.trim();
    const current = seen.get(name.toLowerCase());
    if (!current) {
      seen.set(name.toLowerCase(), {
        name,
        lastCents: row.amountCents,
        kind: row.kind,
        categoryId: row.categoryId,
        category: row.category ? { name: row.category.name, color: row.category.color } : null,
        count: 1,
      });
    } else {
      current.count += 1;
    }
  }
  return NextResponse.json({
    payees: [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 24),
  });
}
