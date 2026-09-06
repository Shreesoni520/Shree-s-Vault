"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api, openPrintSheet, type GroceryItem } from "@/lib/client";
import { centsToPounds, poundsToCents } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";

export function GroceryView() {
  const { money, symbol } = useMoney();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ items: GroceryItem[] }>("/api/grocery");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load grocery"));
  }, [load]);

  const totals = useMemo(() => {
    const monthlyCents = items.reduce((sum, item) => sum + item.estimateCents, 0);
    const boughtCents = items.filter((item) => item.done).reduce((sum, item) => sum + item.estimateCents, 0);
    const leftCents = monthlyCents - boughtCents;
    return {
      monthlyCents,
      boughtCents,
      leftCents,
      leftCount: items.filter((item) => !item.done).length,
    };
  }, [items]);

  async function addItem() {
    if (!name.trim()) {
      toast.error("Type an item name.");
      return;
    }
    const estimateCents = poundsToCents(price || "0") ?? 0;
    setBusy(true);
    try {
      await api("/api/grocery", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), estimateCents, quantity: 1, unit: "", aisle: "Monthly" }),
      });
      setName("");
      setPrice("");
      toast.success("Added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: GroceryItem) {
    try {
      await api(`/api/grocery/${item.id}`, { method: "PUT", body: JSON.stringify({ done: !item.done }) });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item");
    }
  }

  async function savePrice(item: GroceryItem, value: string) {
    const estimateCents = poundsToCents(value || "0") ?? 0;
    try {
      await api(`/api/grocery/${item.id}`, { method: "PUT", body: JSON.stringify({ estimateCents }) });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save price");
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/grocery/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item");
    }
  }

  async function resetMonth() {
    try {
      await api("/api/grocery", { method: "DELETE" });
      toast.success("Cleared ticked items");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear");
    }
  }

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Monthly buys · tick when you get them</p>
          <h1 className="font-heading mt-1 text-4xl tracking-tight">Grocery</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border dark:border-white/20"
          onClick={() => openPrintSheet("grocery")}
          disabled={items.length === 0}
        >
          <Printer /> Print
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="This month" value={money(totals.monthlyCents)} hint={`${items.length} item${items.length === 1 ? "" : "s"}`} />
        <Summary label="Still to buy" value={money(totals.leftCents)} hint={`${totals.leftCount} left`} />
        <Summary label="Bought" value={money(totals.boughtCents)} hint="Ticked this month" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your list</CardTitle>
          <CardDescription>Name + price. No aisles, no recipe merge — just what you buy again.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {items.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">Nothing here yet. Add milk, bread, soap below.</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 hover:border-border hover:bg-muted/30 dark:hover:border-white/10"
            >
              <Checkbox checked={item.done} onChange={() => void toggle(item)} />
              <p className={`min-w-0 flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                {item.name}
              </p>
              <div className="relative w-24 shrink-0">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                  {symbol}
                </span>
                <Input
                  key={`${item.id}-${item.estimateCents}`}
                  inputMode="decimal"
                  defaultValue={item.estimateCents ? String(centsToPounds(item.estimateCents)) : ""}
                  className="pl-5"
                  placeholder="0"
                  onBlur={(event) => void savePrice(item, event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon-xs"
                className="shrink-0 border-border dark:border-white/20"
                onClick={() => void remove(item.id)}
                title="Remove"
              >
                <Trash2 />
              </Button>
            </div>
          ))}

          <form
            className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_110px_auto] dark:border-white/10"
            onSubmit={(event) => {
              event.preventDefault();
              void addItem();
            }}
          >
            <Input
              placeholder="New item"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                {symbol}
              </span>
              <Input
                inputMode="decimal"
                placeholder="Price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="pl-7"
              />
            </div>
            <Button type="submit" disabled={busy} className="sm:min-w-22">
              <Plus /> Add
            </Button>
          </form>
          {items.some((item) => item.done) && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mt-3 self-start text-xs"
              onClick={() => void resetMonth()}
            >
              Remove bought items
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-heading text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">{hint}</CardContent>
    </Card>
  );
}
