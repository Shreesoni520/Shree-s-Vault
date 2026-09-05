"use client";

import { useEffect, useMemo, useState } from "react";
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
  const title = mode === "add" ? "Add money" : mode === "move" ? "Move money" : "Add activity";
  const copy =
    mode === "add"
      ? "Pay, a refund, or cash you put in."
      : mode === "move"
        ? "Shift cash between your accounts. This is not spend."
        : "Something you actually spent. This comes off your available cash.";

  async function save() {
    setSaving(true);
    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount,
          kind,
          date: todayKey(),
          merchant: mode === "move" ? "Move" : merchant,
          note,
          categoryId: mode === "move" ? null : categoryId || null,
          accountId,
          toAccountId: mode === "move" ? toAccountId : null,
          recurring: mode === "move" ? false : recurring,
        }),
      });
      toast.success(mode === "add" ? "Money added" : mode === "move" ? "Moved" : "Paid");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{copy}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">{symbol}</span>
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12.50" className="pl-6" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{mode === "move" ? "From" : "Account"}</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              options={accounts.map((item) => ({ value: item.id, label: `${item.name}` }))}
            />
          </div>
          {mode === "move" ? (
            <div className="col-span-full flex flex-col gap-2 sm:col-span-2">
              <Label>To</Label>
              <Select
                value={toAccountId}
                onValueChange={setToAccountId}
                options={accounts.filter((item) => item.id !== accountId).map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label>{mode === "add" ? "From" : "To"}</Label>
                <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder={mode === "add" ? "Pay" : "What did you pay?"} />
              </div>
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
            </>
          )}
          <div className="col-span-full flex flex-col gap-2">
            <Label>Note</Label>
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
          </div>
          {mode !== "move" && (
            <label className="col-span-full flex items-center gap-2 text-sm">
              <Checkbox checked={recurring} onChange={setRecurring} />
              Repeats every month (you can change the amount later)
            </label>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Working…" : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
