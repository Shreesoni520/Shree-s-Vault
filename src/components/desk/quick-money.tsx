"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { api, type Account, type Category } from "@/lib/client";
import { todayKey } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";

export type MoneyMode = "pay" | "add" | "move";

const COPY = {
  pay: {
    title: "Add a spend",
    hint: "Coffee, rent, a shop run — this comes off the account you pick.",
    action: "Save spend",
    saved: "Spend saved",
    who: "Where did it go?",
    whoHint: "Tesco, rent, coffee…",
    account: "Paid from",
    category: "What kind of spend?",
  },
  add: {
    title: "Add income",
    hint: "Salary, a refund, or cash you put in. This goes onto the account you pick.",
    action: "Save income",
    saved: "Income saved",
    who: "Who paid you?",
    whoHint: "Salary, refund, side work…",
    account: "Goes into",
    category: "What kind of income?",
  },
  move: {
    title: "Move money",
    hint: "Shift cash between your own accounts. This is not income or spend.",
    action: "Move money",
    saved: "Moved",
    who: "",
    whoHint: "",
    account: "From",
    category: "",
  },
} as const;

export function QuickMoneyDialog({
  open,
  mode,
  accounts,
  onOpenChange,
  onSaved,
  preset,
}: {
  open: boolean;
  mode: MoneyMode;
  accounts: Account[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
  preset?: { merchant?: string; amount?: string; categoryId?: string };
}) {
  const { symbol } = useMoney();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayKey());
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(preset?.amount ?? "");
    setMerchant(preset?.merchant ?? "");
    setNote("");
    setDate(todayKey());
    setAccountId(accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? "");
    setCategoryId(preset?.categoryId ?? "");
    setRecurring(false);
    api<{ categories: Category[] }>("/api/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => undefined);
  }, [open, accounts, preset]);

  const kind = mode === "add" ? "income" : mode === "move" ? "transfer" : "expense";
  const filtered = useMemo(
    () => categories.filter((item) => item.kind === kind),
    [categories, kind]
  );
  const copy = COPY[mode];

  async function save() {
    if (!amount.trim()) {
      toast.error("Add an amount.");
      return;
    }
    if (mode !== "move" && !merchant.trim()) {
      toast.error(mode === "add" ? "Say who paid you." : "Say where the money went.");
      return;
    }
    if (mode === "move" && (!accountId || !toAccountId || accountId === toAccountId)) {
      toast.error("Pick two different accounts.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount,
          kind,
          date,
          merchant: mode === "move" ? "Move" : merchant.trim(),
          note,
          categoryId: mode === "move" ? null : categoryId || null,
          accountId,
          toAccountId: mode === "move" ? toAccountId : null,
          recurring: mode === "move" ? false : recurring,
        }),
      });
      toast.success(copy.saved);
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-visible sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.hint}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode !== "move" && (
            <Field label={copy.who}>
              <Input
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                placeholder={copy.whoHint}
                autoComplete="off"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  {symbol}
                </span>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="12.50"
                  inputMode="decimal"
                  className="pl-6"
                />
              </div>
            </Field>
            <Field label="When">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>

          {mode === "move" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Select
                  value={accountId}
                  onValueChange={setAccountId}
                  options={accounts.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              <Field label="To">
                <Select
                  value={toAccountId}
                  onValueChange={setToAccountId}
                  options={accounts.filter((item) => item.id !== accountId).map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
            </div>
          ) : (
            <>
              <Field label={copy.account}>
                <Select
                  value={accountId}
                  onValueChange={setAccountId}
                  options={accounts.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Field>
              <Field label={copy.category}>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  options={[
                    { value: "", label: "Skip for now" },
                    ...filtered.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                />
              </Field>
            </>
          )}

          <Field label="Note" optional>
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything else" />
          </Field>

          {mode !== "move" && (
            <label className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm dark:border-white/15">
              <Checkbox checked={recurring} onChange={setRecurring} />
              <span>
                <span className="block font-medium">Repeats once every month</span>
                <span className="text-muted-foreground text-xs">
                  The amount you type is for the whole month — not weekly. Rent 700 stays 700 until next month.
                </span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : copy.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-xs font-medium">
        {label}
        {optional && <span className="font-normal"> · optional</span>}
      </Label>
      {children}
    </div>
  );
}
