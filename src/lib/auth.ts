import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

export async function seedUserDefaults(userId: string) {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId,
      name: category.name,
      kind: category.kind,
      color: category.color,
    })),
  });
  await prisma.recipe.create({
    data: {
      userId,
      title: "Overnight oats",
      servings: 1,
      minutes: 5,
      tags: "breakfast, vegetarian",
      notes: "Stir oats, milk, and a pinch of salt. Chill overnight. Top with fruit in the morning.",
      ingredients: {
        create: [
          { name: "Rolled oats", quantity: 50, unit: "g", aisle: "Pantry", sortOrder: 0 },
          { name: "Milk", quantity: 150, unit: "ml", aisle: "Dairy", sortOrder: 1 },
          { name: "Honey", quantity: 1, unit: "tsp", aisle: "Pantry", sortOrder: 2 },
          { name: "Banana", quantity: 1, unit: "pcs", aisle: "Produce", sortOrder: 3 },
        ],
      },
    },
  });
  await prisma.recipe.create({
    data: {
      userId,
      title: "Tomato pasta",
      servings: 2,
      minutes: 25,
      tags: "weeknight, vegetarian",
      notes: "Boil pasta. Warm garlic and tomatoes in a pan. Toss together with a little pasta water.",
      ingredients: {
        create: [
          { name: "Spaghetti", quantity: 180, unit: "g", aisle: "Pantry", sortOrder: 0 },
          { name: "Tomatoes", quantity: 400, unit: "g", aisle: "Produce", sortOrder: 1 },
          { name: "Garlic", quantity: 2, unit: "pcs", aisle: "Produce", sortOrder: 2 },
          { name: "Olive oil", quantity: 2, unit: "tbsp", aisle: "Pantry", sortOrder: 3 },
          { name: "Salt", quantity: 1, unit: "tsp", aisle: "Spices", sortOrder: 4 },
        ],
      },
    },
  });

  await prisma.account.create({
    data: { userId, name: "Everyday", type: "current" },
  });
  await prisma.account.create({
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
