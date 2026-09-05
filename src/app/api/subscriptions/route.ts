import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { removeSubscription, upsertSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: { name?: string; amount?: string | number; previousName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that subscription." }, { status: 400 });
  }
  const result = await upsertSubscription(user.id, {
    name: body.name ?? "",
    amount: body.amount ?? 0,
    previousName: body.previousName,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that subscription." }, { status: 400 });
  }
  const result = await removeSubscription(user.id, body.name ?? "");
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
