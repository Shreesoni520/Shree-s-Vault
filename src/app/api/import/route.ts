import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeDate, normalizeKind, parseCsv } from "@/lib/csv";
import { ensureEverydayAccount } from "@/lib/accounts";
import { poundsToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: { csv?: string };
  try {
    body = (await request.json()) as { csv?: string };
  } catch {
    return NextResponse.json({ error: "Could not read that file." }, { status: 400 });
  }

  const rows = parseCsv(body.csv ?? "");
  if (!rows.length) {
    return NextResponse.json({ error: "No rows found in that CSV." }, { status: 400 });
  }

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const everyday = await ensureEverydayAccount(user.id);
  const created: string[] = [];
  let skipped = 0;

  for (const row of rows) {
    const date = normalizeDate(row.date);
    const amountRaw = Number(String(row.amount).replace(/[£€$₹,\s]/g, ""));
    const amountCents = poundsToCents(Math.abs(amountRaw));
    if (!date || amountCents === null || amountCents <= 0) {
      skipped += 1;
      continue;
    }
    const kind = normalizeKind(row.kind, amountRaw);
    const categoryName = row.category.trim();
    let category = categoryName
      ? categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase() && item.kind === kind)
      : null;
    if (categoryName && !category) {
      category = await prisma.category.create({
        data: { userId: user.id, name: categoryName.slice(0, 32), kind, color: "#c9a36a" },
      });
      categories.push(category);
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category?.id ?? null,
        accountId: everyday.id,
        amountCents,
        kind,
        date,
        merchant: row.merchant.slice(0, 80),
        note: row.note.slice(0, 160),
      },
    });
    created.push(tx.id);
  }

  return NextResponse.json({ imported: created.length, skipped });
}
