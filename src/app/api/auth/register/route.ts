import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, makeSalt, publicUser, seedUserDefaults } from "@/lib/auth";
import { withSession } from "@/lib/session";
import { isValidUsername, usernameKey } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: string; password?: string; confirm?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string; confirm?: string };
  } catch {
    return NextResponse.json({ error: "Could not read that form." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = (body.password ?? "").trim();
  const confirm = (body.confirm ?? "").trim();

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 letters, numbers, dots, or underscores." },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const key = usernameKey(username);
  const taken = await prisma.user.findUnique({ where: { username: key } });
  if (taken) {
    return NextResponse.json({ error: "That username is taken. Pick a different one." }, { status: 409 });
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const salt = makeSalt();
      const created = await tx.user.create({
        data: {
          username: key,
          passwordHash: hashPassword(password, salt),
          salt,
          displayName: username,
        },
      });
      await seedUserDefaults(created.id, tx);
      return created;
    });
    return withSession(NextResponse.json({ user: publicUser(user) }), user.username, request);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create that account. Try again." }, { status: 500 });
  }
}
