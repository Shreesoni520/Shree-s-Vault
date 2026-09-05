import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { monthKey } from "@/lib/money";
import { ensureRecurringForMonth, recurringKey } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const month = new URL(request.url).searchParams.get("month") || monthKey();
  const templateId = new URL(request.url).searchParams.get("id");

  if (templateId) {
    const template = await prisma.transaction.findFirst({
      where: { id: templateId, userId: user.id, recurring: true },
    });
    if (!template) return NextResponse.json({ posted: 0 });
    const existing = await prisma.transaction.findMany({
      where: { userId: user.id, date: { startsWith: month } },
    });
    if (existing.some((row) => recurringKey(row) === recurringKey(template))) {
      return NextResponse.json({ posted: 0 });
    }
  }

  const posted = await ensureRecurringForMonth(user.id, month);
  return NextResponse.json({ posted });
}
