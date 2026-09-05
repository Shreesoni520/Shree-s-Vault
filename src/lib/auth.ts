import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { usernameKey } from "@/lib/utils";

export function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function makeSalt() {
  return randomBytes(16).toString("hex");
}

export function passwordsMatch(password: string, passwordHash: string, salt: string) {
  const next = hashPassword(password, salt);
  const left = Buffer.from(next);
  const right = Buffer.from(passwordHash);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = readSession(token);
  if (!username) return null;
  return prisma.user.findUnique({ where: { username: usernameKey(username) } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null as null,
      response: NextResponse.json({ error: "Sign in first." }, { status: 401 }),
    };
  }
  return { user, response: null as null };
}

export async function seedUserDefaults(
  userId: string,
  db: Pick<PrismaClient, "category" | "account"> = prisma
) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId,
      name: category.name,
      kind: category.kind,
      color: category.color,
    })),
  });

  await db.account.create({
    data: { userId, name: "Everyday", type: "current" },
  });
  await db.account.create({
    data: { userId, name: "Savings", type: "savings" },
  });
}

export function publicUser(user: {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
  leftoverGoalCents: number;
  currency: string;
  salaryCents: number;
  onboarded: boolean;
  avatar?: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    leftoverGoalCents: user.leftoverGoalCents,
    currency: user.currency,
    salaryCents: user.salaryCents,
    onboarded: user.onboarded,
    avatar: user.avatar ?? "",
    createdAt: user.createdAt.toISOString(),
  };
}
