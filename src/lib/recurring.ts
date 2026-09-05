export function recurringKey(row: {
  merchant: string;
  amountCents: number;
  kind: string;
  categoryId: string | null;
  note: string;
}) {
  return [row.kind, row.amountCents, row.categoryId ?? "", row.merchant.trim().toLowerCase(), row.note.trim().toLowerCase()].join("|");
}
