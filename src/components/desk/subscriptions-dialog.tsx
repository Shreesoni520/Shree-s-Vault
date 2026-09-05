"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Bill } from "@/lib/client";
import { useMoney } from "@/hooks/use-money";

export function SubscriptionsDialog({
  open,
  items,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  items: Bill[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  const { money, symbol } = useMoney();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function add() {
    setSaving(true);
    try {
      await api("/api/subscriptions", { method: "POST", body: JSON.stringify({ name, amount }) });
      toast.success("Subscription added");
      setName("");
      setAmount("");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    } finally {
      setSaving(false);
    }
  }

  async function remove(merchant: string) {
    setRemoving(merchant);
    try {
      await api("/api/subscriptions", { method: "DELETE", body: JSON.stringify({ name: merchant }) });
      toast.success("Removed");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscriptions</DialogTitle>
          <DialogDescription>
            Netflix, gym, phone — the amount is for the whole month. 15 means 15 once this month, then 15 again next
            month. Not weekly. Rent stays under Household bills.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm">Nothing here yet. Add one below.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.merchant}</p>
                <p className="text-muted-foreground text-xs">once a month</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums text-sm">{money(item.amountCents)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removing === item.merchant}
                  onClick={() => void remove(item.merchant)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Netflix" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Per month</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                {symbol}
              </span>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="15"
                className="pl-7"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void add()} disabled={saving}>
            {saving ? "Saving…" : "Add subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
