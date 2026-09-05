import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { centsToPounds } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const rows = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: { category: true, account: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const header = "date,amount,kind,category,account,merchant,note";
  const lines = rows.map((row) =>
    [
      row.date,
      centsToPounds(row.amountCents).toFixed(2),
      row.kind,
      csvCell(row.category?.name ?? ""),
      csvCell(row.account?.name ?? ""),
      csvCell(row.merchant),
      csvCell(row.note),
    ].join(",")
  );
  const csv = [header, ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shreevault-ledger.csv"`,
    },
  });
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
