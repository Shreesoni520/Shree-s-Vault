import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const rows = await prisma.transaction.findMany({
    where: { userId: user.id, merchant: { not: "" } },
    select: { merchant: true },
    distinct: ["merchant"],
    orderBy: { merchant: "asc" },
    take: 80,
  });
  return NextResponse.json({ merchants: rows.map((row) => row.merchant) });
}
