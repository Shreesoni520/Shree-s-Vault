import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, makeSalt, passwordsMatch, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: { current?: string; next?: string; confirm?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const current = body.current ?? "";
  const next = body.next ?? "";
  const confirm = body.confirm ?? "";
  if (!passwordsMatch(current, user.passwordHash, user.salt)) {
    return NextResponse.json({ error: "Current password is wrong." }, { status: 401 });
  }
  if (next.length < 4) {
    return NextResponse.json({ error: "New password should be at least 4 characters." }, { status: 400 });
  }
  if (next !== confirm) {
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  }

  const salt = makeSalt();
  await prisma.user.update({
    where: { id: user.id },
    data: { salt, passwordHash: hashPassword(next, salt) },
  });
  return NextResponse.json({ ok: true });
}
