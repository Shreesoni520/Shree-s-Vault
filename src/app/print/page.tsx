"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintSheet } from "@/components/print/print-sheet";
import { api, type Account, type Goal, type GroceryItem, type Transaction } from "@/lib/client";
import { useAuth } from "@/context/auth-context";
import { APP_NAME } from "@/lib/brand";
import { monthKey } from "@/lib/money";

type Kind = "grocery" | "ledger" | "accounts";

function asKind(value: string | null): Kind {
  if (value === "grocery" || value === "accounts") return value;
  return "ledger";
}

function PrintStudio() {
  const search = useSearchParams();
  const kind = asKind(search.get("kind"));
  const rawMonth = search.get("month");
  const month = rawMonth === "all" ? "" : rawMonth || (kind === "ledger" ? monthKey() : "");
  const { ready, user } = useAuth();
  const [grocery, setGrocery] = useState<GroceryItem[]>([]);
  const [ledger, setLedger] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    if (kind === "grocery") return `${APP_NAME} grocery`;
    if (kind === "accounts") return `${APP_NAME} accounts`;
    return `${APP_NAME} ledger${month ? ` ${month}` : ""}`;
  }, [kind, month]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setError("Sign in first.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        if (kind === "grocery") {
          const data = await api<{ items: GroceryItem[] }>("/api/grocery");
          setGrocery(data.items);
        } else if (kind === "accounts") {
          const [accountData, goalData] = await Promise.all([
            api<{ accounts: Account[] }>("/api/accounts"),
            api<{ goals: Goal[] }>("/api/goals"),
          ]);
          setAccounts(accountData.accounts.filter((row) => !row.archived));
          setGoals(goalData.goals);
        } else {
          const query = month ? `?month=${month}` : "";
          const data = await api<{ transactions: Transaction[] }>(`/api/transactions${query}`);
          setLedger(data.transactions.slice().sort((a, b) => a.date.localeCompare(b.date)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load that list.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, user, kind, month]);

  return (
    <div className="print-studio min-h-svh bg-stone-200 text-stone-900">
      <div className="print-chrome mx-auto flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div>
          <p className="text-sm font-medium tracking-tight">Ready to print</p>
          <p className="text-stone-600 text-xs">
            This page stays open. Tap Print / PDF when you want the printer box. Turn off headers and footers if you see the website URL.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.close()}>
            Close
          </Button>
          <Button onClick={() => window.print()} disabled={loading || Boolean(error)}>
            <Printer /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="print-preview px-4 pb-10">
        {loading && <p className="py-16 text-center text-sm text-neutral-600">Preparing the A4 sheet…</p>}
        {error && <p className="py-16 text-center text-sm text-red-700">{error}</p>}
        {!loading && !error && (
          <PrintSheet
            kind={kind}
            currency={user?.currency ?? "GBP"}
            month={month || undefined}
            grocery={grocery}
            ledger={ledger}
            accounts={accounts}
            goals={goals}
          />
        )}
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-neutral-600">Preparing the A4 sheet…</p>}>
      <PrintStudio />
    </Suspense>
  );
}
