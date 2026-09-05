import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateInMonth, monthKey } from "@/lib/money";
import { recurringKey } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const month = new URL(request.url).searchParams.get("month") || monthKey();
  const templateId = new URL(request.url).searchParams.get("id");

  const templates = await prisma.transaction.findMany({
    where: { userId: user.id, recurring: true },
    orderBy: { date: "desc" },
  });

  const seen = new Set<string>();
  const unique = [];
  for (const row of templates) {
    const key = recurringKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  if (templateId) {
    const picked = unique.filter((row) => row.id === templateId);
    unique.length = 0;
    unique.push(...picked);
  }

  const existing = await prisma.transaction.findMany({
    where: { userId: user.id, date: { startsWith: month } },
  });
  const existingKeys = new Set(existing.map((row) => recurringKey(row)));

  const created = [];
  for (const row of unique) {
    if (existingKeys.has(recurringKey(row))) continue;
    created.push(
      await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: row.categoryId,
          accountId: row.accountId,
          toAccountId: row.toAccountId,
          amountCents: row.amountCents,
          kind: row.kind,
          date: dateInMonth(row.date, month),
          note: row.note,
          merchant: row.merchant,
          recurring: true,
        },
      })
    );
  }

  return NextResponse.json({ posted: created.length });
}
