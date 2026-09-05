import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passwordsMatch, publicUser } from "@/lib/auth";
import { withSession } from "@/lib/session";
import { usernameKey } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const username = usernameKey(body.username ?? "");
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "Enter a username and password." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "No account with that username." }, { status: 401 });
    }
    if (!passwordsMatch(password, user.passwordHash, user.salt)) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }
    return withSession(NextResponse.json({ user: publicUser(user) }), user.username, request);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not sign in. Try again." }, { status: 500 });
  }
}
