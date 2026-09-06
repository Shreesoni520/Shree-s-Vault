export async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || "Could not continue";
  } catch {
    return "Could not continue";
  }
}

export type ExportKind = "ledger" | "grocery" | "accounts";

export function openPrintSheet(kind: ExportKind, month?: string) {
  const query = new URLSearchParams({ kind });
  if (month) query.set("month", month);
  window.open(`/print?${query}`, "_blank", "noopener,noreferrer");
}

export async function downloadExport(kind: ExportKind, month?: string) {
  const query = new URLSearchParams({ kind });
  if (month) query.set("month", month);
  const response = await fetch(`/api/export?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const match = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = match?.[1] ?? `shreevault-${kind}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | string;
  color: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  openingCents: number;
  archived: boolean;
  balanceCents: number;
};

export type Goal = {
  id: string;
  name: string;
  targetCents: number;
  savedCents: number;
  deadline: string;
};

export type Transaction = {
  id: string;
  amountCents: number;
  kind: "income" | "expense" | "transfer" | string;
  date: string;
  note: string;
  merchant: string;
  recurring: boolean;
  categoryId: string | null;
  category: Category | null;
  accountId: string | null;
  toAccountId: string | null;
  account?: Account | null;
  toAccount?: Account | null;
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  done: boolean;
  recipeTitle: string;
  estimateCents: number;
};

export type Budget = {
  id: string;
  month: string;
  amountCents: number;
  categoryId: string | null;
  category: Category | null;
  usedCents?: number;
};

export type Bill = {
  id: string;
  merchant: string;
  amountCents: number;
  kind: string;
  posted: boolean;
  day: number;
};

export type DeskStats = {
  month: string;
  income: number;
  spend: number;
  saved: number;
  rate: number;
  spendDelta: number | null;
  leftoverGoalCents: number;
  uncategorised: number;
  everydaySpend: number;
  dailySpend: number;
  projectedSpend: number;
  remainingDays: number;
  cash: number;
  potsSaved: number;
  weekIncome: number;
  weekSpend: number;
  insights: { tone: "good" | "warn" | "info"; text: string }[];
  recurringTemplates: number;
  topCategories: { name: string; color: string; cents: number }[];
  series: { month: string; label: string; income: number; spend: number }[];
  budgets: Budget[];
  accounts: Account[];
  goals: Goal[];
  bills: Bill[];
  subscriptions: Bill[];
  groceryCount: number;
  recent: Transaction[];
};
