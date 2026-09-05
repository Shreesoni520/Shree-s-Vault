"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Plus, Repeat, Search, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { KindPills, Select } from "@/components/ui/select";
import { MonthNav } from "@/components/desk/month-nav";
import { api, type Account, type Budget, type Category, type Transaction } from "@/lib/client";
import { SAMPLE_CSV } from "@/lib/csv";
import { CATEGORY_COLORS } from "@/lib/defaults";
import { useDebounced } from "@/hooks/use-debounced";
import { useMoney } from "@/hooks/use-money";
import { centsToPounds, formatDay, kindLabel, monthKey, todayKey } from "@/lib/money";
import { cn } from "@/lib/utils";

export function LedgerView() {
  const { money, symbol } = useMoney();
  const [month, setMonth] = useState(monthKey());
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput);
  const [kind, setKind] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [merchants, setMerchants] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", kind: "expense", color: "#c9a36a" });

  const load = useCallback(async () => {
    const [catData, txData, budgetData, accountData] = await Promise.all([
      api<{ categories: Category[] }>("/api/categories"),
      api<{ transactions: Transaction[] }>(
        `/api/transactions?month=${month}${kind ? `&kind=${kind}` : ""}${categoryFilter ? `&categoryId=${categoryFilter}` : ""}${accountFilter ? `&accountId=${accountFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`
      ),
      api<{ budgets: Budget[] }>(`/api/budgets?month=${month}`),
      api<{ accounts: Account[] }>("/api/accounts"),
    ]);
    setCategories(catData.categories);
    setTransactions(txData.transactions);
    setBudgets(budgetData.budgets);
    setAccounts(accountData.accounts);
  }, [month, kind, q, categoryFilter, accountFilter]);

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load ledger"));
  }, [load]);

  useEffect(() => {
    api<{ merchants: string[] }>("/api/merchants")
      .then((data) => setMerchants(data.merchants))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        setEditing(null);
        setOpen(true);
      }
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("ledger-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const existing = budgets.find((item) => (item.categoryId ?? "") === budgetCategory);
    setBudgetAmount(existing ? String(centsToPounds(existing.amountCents)) : "");
  }, [budgetCategory, budgets]);

  const expenseCategories = categories.filter((item) => item.kind === "expense");
  const income = transactions.filter((row) => row.kind === "income").reduce((sum, row) => sum + row.amountCents, 0);
  const spend = transactions.filter((row) => row.kind === "expense").reduce((sum, row) => sum + row.amountCents, 0);

  const envelopes = budgets.map((budget) => {
    const used = transactions
      .filter((row) =>
        row.kind === "expense" && (budget.categoryId ? row.categoryId === budget.categoryId : true)
      )
      .reduce((sum, row) => sum + row.amountCents, 0);
    return { ...budget, usedCents: budget.categoryId ? used : spend };
  });

  async function saveBudget() {
    try {
      await api("/api/budgets", {
        method: "POST",
        body: JSON.stringify({
          month,
          categoryId: budgetCategory || null,
          amount: budgetAmount,
        }),
      });
      toast.success("Envelope saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save budget");
    }
  }

  async function addCategory() {
    try {
      await api("/api/categories", { method: "POST", body: JSON.stringify(newCategory) });
      toast.success("Category added");
      setNewCategory({ name: "", kind: "expense", color: "#c9a36a" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category");
    }
  }

  async function removeCategory(id: string) {
    if (!window.confirm("Delete this category? Lines stay, but they become uncategorised.")) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category");
    }
  }

  async function importCsv() {
    try {
      const data = await api<{ imported: number; skipped: number }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      toast.success(`Imported ${data.imported} rows${data.skipped ? `, skipped ${data.skipped}` : ""}`);
      setImportOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import");
    }
  }

  async function applyRepeats() {
    try {
      const data = await api<{ posted: number }>(`/api/transactions/repeat?month=${month}`, { method: "POST" });
      toast.success(data.posted ? `Posted ${data.posted} repeating line${data.posted === 1 ? "" : "s"}` : "Nothing due this month");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post repeats");
    }
  }

  async function copyLastMonth() {
    try {
      const data = await api<{ copied: number }>(`/api/budgets/copy?month=${month}`, { method: "POST" });
      toast.success(`Copied ${data.copied} envelopes`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy envelopes");
    }
  }

  async function duplicate(row: Transaction) {
    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: centsToPounds(row.amountCents),
          kind: row.kind,
          date: todayKey(),
          merchant: row.merchant,
          note: row.note,
          categoryId: row.categoryId,
          accountId: row.accountId,
          toAccountId: row.toAccountId,
          recurring: row.recurring,
        }),
      });
      toast.success("Duplicated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not duplicate");
    }
  }

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Income, spend, envelopes</p>
          <h1 className="font-heading mt-1 text-4xl tracking-tight">Ledger</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void applyRepeats()}>
            <Repeat /> Post repeats
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload /> Import CSV
          </Button>
          <a href="/api/export" className={cn(buttonVariants({ variant: "outline" }))}>
            <Download /> Export
          </a>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Add line
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MonthNav month={month} onChange={setMonth} />
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search notes, shops, categories"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            className="pl-8"
            id="ledger-search"
          />
        </div>
        <KindPills value={kind} onChange={setKind} />
        <Select
          className="w-44"
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          options={[
            { value: "", label: "All categories" },
            { value: "none", label: "Uncategorised" },
            ...categories.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          className="w-40"
          value={accountFilter}
          onValueChange={setAccountFilter}
          options={[
            { value: "", label: "All pots" },
            ...accounts.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <div className="ml-auto flex items-center gap-4 text-sm tabular-nums">
          <span>
            In <span className="text-emerald-400">{money(income)}</span>
          </span>
          <span className="text-muted-foreground">
            Out <span className="text-foreground">{money(spend)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>Click a row to edit · N to add · / to search</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {transactions.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nothing here yet. Add a line or import a CSV.
              </p>
            )}
            {transactions.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    setEditing(row);
                    setOpen(true);
                  }}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: row.category?.color ?? "#8d8a7a" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {row.kind === "transfer"
                        ? `${row.account?.name ?? "Pot"} → ${row.toAccount?.name ?? "Pot"}`
                        : row.merchant || row.note || "Untitled"}
                      {row.recurring && <span className="text-muted-foreground ml-2 text-xs">repeat</span>}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDay(row.date)} ·{" "}
                      {row.kind === "transfer"
                        ? "Move"
                        : row.category?.name ?? "Uncategorised"}
                      {row.account && row.kind !== "transfer" ? ` · ${row.account.name}` : ""}
                    </p>
                  </div>
                </button>
                <div className="ml-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Duplicate"
                    onClick={() => void duplicate(row)}
                  >
                    <Copy />
                  </Button>
                  <span
                    className={cn(
                      "min-w-24 text-right text-sm tabular-nums",
                      row.kind === "income" ? "text-emerald-400" : row.kind === "transfer" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {row.kind === "income" ? "+" : row.kind === "transfer" ? "→" : "−"}
                    {money(row.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Category envelope</CardTitle>
              <CardDescription>A monthly cap for one category</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Select
                value={budgetCategory}
                onValueChange={setBudgetCategory}
                options={[
                  { value: "", label: "All spend" },
                  ...expenseCategories.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">{symbol}</span>
                <Input
                  placeholder="100"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  className="pl-6"
                />
              </div>
              <Button variant="outline" onClick={() => void copyLastMonth()}>
                Copy last month
              </Button>
              <Button onClick={() => void saveBudget()}>Save envelope</Button>
              {envelopes.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  {envelopes.map((budget) => {
                    const used = budget.usedCents ?? 0;
                    const pct = budget.amountCents ? Math.min(100, Math.round((used / budget.amountCents) * 100)) : 0;
                    return (
                      <div key={budget.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{budget.category?.name ?? "All spend"}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {money(used)} / {money(budget.amountCents)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Yours alone — income and spend</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Name"
                value={newCategory.name}
                onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addCategory();
                }}
              />
              <KindPills
                includeAll={false}
                value={newCategory.kind}
                onChange={(value) => setNewCategory((current) => ({ ...current, kind: value || "expense" }))}
              />
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Colour ${color}`}
                    onClick={() => setNewCategory((current) => ({ ...current, color }))}
                    className={cn(
                      "size-4 rounded-full ring-offset-2 ring-offset-card",
                      newCategory.color === color ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100"
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
              <Button variant="outline" onClick={() => void addCategory()}>
                Add category
              </Button>
              <div className="flex max-h-56 flex-col gap-1 overflow-auto pr-1">
                {categories.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                      <span className="text-muted-foreground text-xs">{kindLabel(item.kind)}</span>
                    </span>
                    <Button variant="ghost" size="icon-xs" onClick={() => void removeCategory(item.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <LineDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        accounts={accounts}
        merchants={merchants}
        editing={editing}
        onSaved={async () => {
          setOpen(false);
          await load();
        }}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>
              Headers can be date, amount, kind, category, merchant, note. Dates like 2026-09-01 or 01/09/2026.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} className="min-h-56 font-mono text-xs" />
          <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-2 text-sm hover:text-foreground">
            <Upload className="size-3.5" />
            Choose a .csv file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setCsvText(await file.text());
              }}
            />
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "shreevault-sample.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download sample
            </Button>
            <Button onClick={() => void importCsv()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  merchants,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  accounts: Account[];
  merchants: string[];
  editing: Transaction | null;
  onSaved: () => Promise<void>;
}) {
  const { symbol } = useMoney();
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("expense");
  const [date, setDate] = useState(monthKey() + "-01");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [recurring, setRecurring] = useState(false);

  useEffect(() => {
    if (editing) {
      setAmount(String(centsToPounds(editing.amountCents)));
      setKind(editing.kind);
      setDate(editing.date);
      setMerchant(editing.merchant);
      setNote(editing.note);
      setCategoryId(editing.categoryId ?? "");
      setAccountId(editing.accountId ?? accounts[0]?.id ?? "");
      setToAccountId(editing.toAccountId ?? "");
      setRecurring(Boolean(editing.recurring));
    } else {
      setAmount("");
      setKind("expense");
      setDate(new Date().toISOString().slice(0, 10));
      setMerchant("");
      setNote("");
      setCategoryId("");
      setAccountId(accounts[0]?.id ?? "");
      setToAccountId(accounts[1]?.id ?? "");
      setRecurring(false);
    }
  }, [editing, open, accounts]);

  const filtered = useMemo(
    () => categories.filter((item) => item.kind === kind),
    [categories, kind]
  );

  async function save() {
    try {
      const payload = {
        amount,
        kind,
        date,
        merchant,
        note,
        categoryId: kind === "transfer" ? null : categoryId || null,
        accountId: accountId || null,
        toAccountId: kind === "transfer" ? toAccountId || null : null,
        recurring,
      };
      if (editing) {
        await api(`/api/transactions/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Line updated");
      } else {
        await api("/api/transactions", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Line added");
      }
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this line?")) return;
    if (!editing) return;
    try {
      await api(`/api/transactions/${editing.id}`, { method: "DELETE" });
      toast.success("Line deleted");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit line" : "Add a line"}</DialogTitle>
          <DialogDescription>
            {kind === "transfer" ? "Move cash between pots. This is not income or spend." : "Amounts are in pounds. Pick income or spend."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">{symbol}</span>
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12.50" className="pl-6" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Kind</Label>
            <Select
              value={kind}
              onValueChange={setKind}
              options={[
                { value: "expense", label: "Spend" },
                { value: "income", label: "Income" },
                { value: "transfer", label: "Move between pots" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{kind === "transfer" ? "From" : "Pot"}</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              options={accounts.map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>
          {kind === "transfer" ? (
            <div className="flex flex-col gap-2">
              <Label>To</Label>
              <Select
                value={toAccountId}
                onValueChange={setToAccountId}
                options={accounts.filter((item) => item.id !== accountId).map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
          ) : (
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              options={[
                { value: "", label: "Uncategorised" },
                ...filtered.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Shop / source</Label>
            <Input list="merchant-list" value={merchant} onChange={(event) => setMerchant(event.target.value)} />
            <datalist id="merchant-list">
              {merchants.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Note</Label>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={recurring} onChange={setRecurring} />
            Repeats monthly — use Post repeats on the new month
          </label>
        </div>
        <DialogFooter>
          {editing && (
            <Button variant="destructive" className="mr-auto" onClick={() => void remove()}>
              Delete
            </Button>
          )}
          <Button onClick={() => void save()}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
