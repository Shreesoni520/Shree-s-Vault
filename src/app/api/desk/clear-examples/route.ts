import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clearExampleActivity } from "@/lib/bills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const removed = await clearExampleActivity(user.id);
  return NextResponse.json({ removed });
}
