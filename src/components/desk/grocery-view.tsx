"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { api, type GroceryItem } from "@/lib/client";
import { AISLES } from "@/lib/defaults";
import { formatQty } from "@/lib/recipes";
import { centsToPounds, poundsToCents } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";

export function GroceryView() {
  const { money, symbol } = useMoney();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [aisle, setAisle] = useState("Other");

  const load = useCallback(async () => {
    const data = await api<{ items: GroceryItem[] }>("/api/grocery");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load grocery"));
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const item of items) {
      const key = item.aisle || "Other";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  async function addItem() {
    if (!name.trim()) {
      toast.error("Add an item name.");
      return;
    }
    try {
      await api("/api/grocery", {
        method: "POST",
        body: JSON.stringify({ name, quantity: Number(quantity) || 1, unit, aisle }),
      });
      setName("");
      setQuantity("1");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add item");
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

  async function remove(id: string) {
    try {
      await api(`/api/grocery/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item");
    }
  }

  async function clearDone() {
    try {
      await api("/api/grocery", { method: "DELETE" });
      toast.success("Cleared ticked items");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear");
    }
  }

  function copyList() {
    const open = grouped
      .map(([group, rows]) => {
        const leftover = rows.filter((item) => !item.done);
        if (!leftover.length) return "";
        return `${group}\n${leftover.map((item) => `- ${formatQty(item.quantity)} ${item.unit} ${item.name}`).join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
    void navigator.clipboard.writeText(open || "Nothing left to pick up.");
    toast.success("Copied grocery list");
  }

  async function mergeDupes() {
    try {
      const data = await api<{ merged: number }>("/api/grocery/merge", { method: "POST" });
      toast.success(data.merged ? `Merged ${data.merged} duplicate${data.merged === 1 ? "" : "s"}` : "Nothing to merge");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not merge");
    }
  }

  async function saveEstimate(item: GroceryItem, value: string) {
    const cents = poundsToCents(value || "0") ?? 0;
    try {
      await api(`/api/grocery/${item.id}`, { method: "PUT", body: JSON.stringify({ estimateCents: cents }) });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save estimate");
    }
  }

  function printList() {
    window.print();
  }

  const remaining = items.filter((item) => !item.done).length;
  const estimate = items.filter((item) => !item.done).reduce((sum, item) => sum + item.estimateCents, 0);

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {remaining} of {items.length} still to pick up
            {estimate ? ` · about ${money(estimate)}` : ""}
          </p>
          <h1 className="font-heading mt-1 text-4xl tracking-tight">Grocery list</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void mergeDupes()} disabled={items.length < 2}>
            Merge dupes
          </Button>
          <Button variant="outline" onClick={printList} disabled={!items.length}>
            <Printer /> Print
          </Button>
          <Button variant="outline" onClick={copyList} disabled={!items.length}>
            Copy list
          </Button>
          <Button variant="outline" onClick={() => void clearDone()} disabled={!items.some((item) => item.done)}>
            Clear ticked
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add by hand</CardTitle>
          <CardDescription>Or tick ingredients on a recipe and send them here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_80px_100px_140px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void addItem();
            }}
          >
            <Input placeholder="Item" value={name} onChange={(event) => setName(event.target.value)} />
            <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input placeholder="unit" value={unit} onChange={(event) => setUnit(event.target.value)} />
            <Select
              value={aisle}
              onValueChange={setAisle}
              options={AISLES.map((item) => ({ value: item, label: item }))}
            />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      {grouped.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Your basket is empty.</p>
      )}

      {grouped.map(([group, rows]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {group}
              <span className="text-muted-foreground text-xs font-sans font-normal">
                {rows.filter((item) => !item.done).length} left
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {rows.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
                <Checkbox checked={item.done} onChange={() => void toggle(item)} />
                <div className="min-w-0 flex-1">
                  <p className={item.done ? "text-muted-foreground text-sm line-through" : "text-sm"}>
                    {formatQty(item.quantity)} {item.unit} {item.name}
                  </p>
                  {item.recipeTitle && <p className="text-muted-foreground text-xs">from {item.recipeTitle}</p>}
                </div>
                <div className="relative w-20">
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 text-xs">{symbol}</span>
                  <Input
                    defaultValue={item.estimateCents ? String(centsToPounds(item.estimateCents)) : ""}
                    className="pl-5"
                    placeholder="0"
                    onBlur={(event) => void saveEstimate(item, event.target.value)}
                  />
                </div>
                <Button variant="ghost" size="xs" onClick={() => void remove(item.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
