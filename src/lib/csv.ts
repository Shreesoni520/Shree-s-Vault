export type CsvRow = {
  date: string;
  amount: string;
  kind: string;
  category: string;
  merchant: string;
  note: string;
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const HEADER_MAP: Record<string, keyof CsvRow> = {
  date: "date",
  day: "date",
  amount: "amount",
  value: "amount",
  money: "amount",
  kind: "kind",
  type: "kind",
  inout: "kind",
  category: "category",
  merchant: "merchant",
  payee: "merchant",
  shop: "merchant",
  note: "note",
  notes: "note",
  description: "note",
  memo: "note",
};

export function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const indexes = headers.map((header) => HEADER_MAP[header] ?? null);
  const hasDate = indexes.includes("date");
  const hasAmount = indexes.includes("amount");
  const start = hasDate && hasAmount ? 1 : 0;
  const rows: CsvRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: CsvRow = { date: "", amount: "", kind: "", category: "", merchant: "", note: "" };
    if (start === 1) {
      cells.forEach((cell, index) => {
        const key = indexes[index];
        if (key) row[key] = cell;
      });
    } else {
      row.date = cells[0] ?? "";
      row.amount = cells[1] ?? "";
      row.kind = cells[2] ?? "";
      row.category = cells[3] ?? "";
      row.merchant = cells[4] ?? "";
      row.note = cells[5] ?? "";
    }
    if (row.date || row.amount) rows.push(row);
  }
  return rows;
}

export function normalizeKind(value: string, amount?: number) {
  const raw = value.trim().toLowerCase();
  if (["income", "in", "credit", "+", "pay"].includes(raw)) return "income";
  if (["expense", "out", "debit", "-", "spend"].includes(raw)) return "expense";
  if (typeof amount === "number" && amount < 0) return "expense";
  return "expense";
}

export function normalizeDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  const uk = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (uk) {
    const day = uk[1].padStart(2, "0");
    const month = uk[2].padStart(2, "0");
    return `${uk[3]}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

export const SAMPLE_CSV = `date,amount,kind,category,merchant,note
2026-09-01,2400,income,Pay,Acme Ltd,September pay
2026-09-02,86.40,expense,Groceries,Tesco,Weekly shop
2026-09-04,12.50,expense,Eating out,Cafe Nero,Coffee
2026-09-06,45.00,expense,Transport,Trainline,Return ticket
`;
