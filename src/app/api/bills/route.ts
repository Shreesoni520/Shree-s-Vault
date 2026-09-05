import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { upsertHouseholdBills } from "@/lib/bills";
import { monthKey } from "@/lib/money";
import { ensureRecurringForMonth } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: Record<string, string | number> = {};
  try {
    body = (await request.json()) as Record<string, string | number>;
  } catch {
    return NextResponse.json({ error: "Could not read those bills." }, { status: 400 });
  }
  const saved = await upsertHouseholdBills(user.id, body);
  await ensureRecurringForMonth(user.id, monthKey());
  return NextResponse.json({ saved });
}
