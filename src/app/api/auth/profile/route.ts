import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicUser, requireUser } from "@/lib/auth";
import { isCurrency } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: { displayName?: string; leftoverGoalCents?: number; currency?: string; salaryCents?: number; avatar?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const displayName = body.displayName?.trim();
  if (displayName !== undefined && (displayName.length < 1 || displayName.length > 40)) {
    return NextResponse.json({ error: "Display name should be 1-40 characters." }, { status: 400 });
  }

  const leftoverGoalCents =
    body.leftoverGoalCents === undefined ? undefined : Math.max(0, Math.round(Number(body.leftoverGoalCents) || 0));
  const salaryCents =
    body.salaryCents === undefined ? undefined : Math.max(0, Math.round(Number(body.salaryCents) || 0));
  const currency = body.currency && isCurrency(body.currency) ? body.currency : undefined;
  const avatar =
    body.avatar === undefined
      ? undefined
      : body.avatar === ""
        ? ""
        : body.avatar.startsWith("data:image/") && body.avatar.length < 350_000
          ? body.avatar
          : undefined;
  if (body.avatar && body.avatar !== "" && avatar === undefined) {
    return NextResponse.json({ error: "Use a smaller photo (under about 250KB)." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(displayName ? { displayName } : {}),
      ...(leftoverGoalCents === undefined ? {} : { leftoverGoalCents }),
      ...(salaryCents === undefined ? {} : { salaryCents }),
      ...(currency ? { currency } : {}),
      ...(avatar === undefined ? {} : { avatar }),
    },
  });
  return NextResponse.json({ user: publicUser(updated) });
}
