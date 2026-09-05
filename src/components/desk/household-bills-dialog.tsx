"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Bill } from "@/lib/client";
import { HOUSEHOLD_BILLS } from "@/lib/household";
import { centsToPounds } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";

export function HouseholdBillsDialog({
  open,
  bills,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  bills: Bill[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}) {
  const { symbol } = useMoney();
  const [values, setValues] = useState({ rent: "", light: "", water: "", internet: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = { rent: "", light: "", water: "", internet: "" };
    for (const item of HOUSEHOLD_BILLS) {
      const match = bills.find((bill) => bill.merchant.toLowerCase() === item.merchant.toLowerCase());
      if (match) next[item.key] = String(centsToPounds(match.amountCents));
    }
    setValues(next);
  }, [open, bills]);

  async function save() {
    setSaving(true);
    try {
      await api("/api/bills", { method: "POST", body: JSON.stringify(values) });
      toast.success("Bills updated");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save bills");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Household bills</DialogTitle>
          <DialogDescription>
            Amounts are for the whole month. Rent 700 means 700 once this month, then 700 again next month — not every
            week. Leave blank to skip a bill.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {HOUSEHOLD_BILLS.map((bill) => (
            <div key={bill.key} className="flex flex-col gap-1.5">
              <Label>{bill.label}</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  {symbol}
                </span>
                <Input
                  inputMode="decimal"
                  value={values[bill.key]}
                  onChange={(event) => setValues((current) => ({ ...current, [bill.key]: event.target.value }))}
                  placeholder="0"
                  className="pl-7"
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save bills"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
