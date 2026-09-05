"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AccountSheet } from "@/components/desk/account-sheet";
import { api, type Account, type Goal } from "@/lib/client";
import { centsToPounds, poundsToCents } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";

export function PotsView() {
  const { money, symbol } = useMoney();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("current");
  const [opening, setOpening] = useState("0");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [openAccount, setOpenAccount] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [accountData, goalData] = await Promise.all([
      api<{ accounts: Account[] }>("/api/accounts"),
      api<{ goals: Goal[] }>("/api/goals"),
    ]);
    setAccounts(accountData.accounts);
    setGoals(goalData.goals);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load pots"));
  }, [load]);

  const cash = accounts.reduce((sum, row) => sum + row.balanceCents, 0);
  const saved = goals.reduce((sum, row) => sum + row.savedCents, 0);

  async function addAccount() {
    try {
      await api("/api/accounts", { method: "POST", body: JSON.stringify({ name, type, opening }) });
      setName("");
      setOpening("0");
      toast.success("Pot added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add pot");
    }
  }

  async function saveOpening(account: Account, value: string) {
    try {
      await api(`/api/accounts/${account.id}`, {
        method: "PUT",
        body: JSON.stringify({ opening: value }),
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update pot");
    }
  }

  async function removeAccount(id: string) {
    if (!window.confirm("Delete this pot? Lines move to Everyday.")) return;
    try {
      await api(`/api/accounts/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete pot");
    }
  }

  async function addGoal() {
    try {
      await api("/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: goalName, target: goalTarget, deadline: goalDeadline }),
      });
      setGoalName("");
      setGoalTarget("");
      setGoalDeadline("");
      toast.success("Goal added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add goal");
    }
  }

  async function moveGoal(id: string, delta: number) {
    try {
      await api(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify({ delta }) });
      setAddAmounts((current) => ({ ...current, [id]: "" }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update goal");
    }
  }

  async function removeGoal(id: string) {
    if (!window.confirm("Delete this savings goal?")) return;
    try {
      await api(`/api/goals/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete goal");
    }
  }

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div>
        <p className="text-muted-foreground text-sm">Cash across accounts · {money(cash)} available</p>
        <h1 className="font-heading mt-1 text-4xl tracking-tight">Accounts</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Across accounts" value={money(cash)} hint="Opening + income − spend ± moves" />
        <Summary label="In savings goals" value={money(saved)} hint={`${goals.length} goal${goals.length === 1 ? "" : "s"}`} />
        <Summary
          label="Still to fill"
          value={money(Math.max(0, goals.reduce((sum, row) => sum + row.targetCents - row.savedCents, 0)))}
          hint="Targets minus saved"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Everyday, savings, cash in a drawer. Set the opening figure once.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_90px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void addAccount();
              }}
            >
              <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Select
                value={type}
                onValueChange={setType}
                options={[
                  { value: "current", label: "Current" },
                  { value: "savings", label: "Savings" },
                  { value: "cash", label: "Cash" },
                ]}
              />
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">{symbol}</span>
                <Input value={opening} onChange={(event) => setOpening(event.target.value)} className="pl-5" />
              </div>
              <Button type="submit">
                <Plus /> Add
              </Button>
            </form>
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border px-3 py-3">
                <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpenAccount(account.id)}>
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-muted-foreground text-xs capitalize">{account.type} · tap for statement</p>
                  </div>
                  <p className="font-heading text-xl tabular-nums">{money(account.balanceCents)}</p>
                </button>
                <div className="mt-3 flex items-center gap-2">
                  <Label className="text-muted-foreground text-xs">Opening</Label>
                  <div className="relative w-28">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">{symbol}</span>
                    <Input
                      defaultValue={String(centsToPounds(account.openingCents))}
                      className="pl-5"
                      onBlur={(event) => void saveOpening(account, event.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="icon-xs" className="ml-auto" onClick={() => void removeAccount(account.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="size-4" /> Savings goals
            </CardTitle>
            <CardDescription>Track a holiday, a buffer, or a thing you want. Add pounds as you set them aside.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void addGoal();
              }}
            >
              <Input placeholder="Emergency buffer" value={goalName} onChange={(event) => setGoalName(event.target.value)} />
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">{symbol}</span>
                <Input placeholder="1000" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} className="pl-5" />
              </div>
              <Button type="submit">Add</Button>
            </form>
            <Input type="date" value={goalDeadline} onChange={(event) => setGoalDeadline(event.target.value)} />
            {goals.length === 0 && <p className="text-muted-foreground text-sm">No goals yet. Name one and set a target.</p>}
            {goals.map((goal) => {
              const pct = goal.targetCents ? Math.min(100, Math.round((goal.savedCents / goal.targetCents) * 100)) : 0;
              const add = poundsToCents(addAmounts[goal.id] || "0") ?? 0;
              return (
                <div key={goal.id} className="rounded-xl border px-3 py-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{goal.name}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {money(goal.savedCents)} of {money(goal.targetCents)}
                        {goal.deadline ? ` · by ${goal.deadline}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-xs" onClick={() => void removeGoal(goal.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">{symbol}</span>
                      <Input
                        placeholder="50"
                        value={addAmounts[goal.id] ?? ""}
                        onChange={(event) => setAddAmounts((current) => ({ ...current, [goal.id]: event.target.value }))}
                        className="pl-5"
                      />
                    </div>
                    <Button variant="outline" disabled={!add} onClick={() => void moveGoal(goal.id, centsToPounds(add))}>
                      Add
                    </Button>
                    <Button variant="outline" disabled={!add} onClick={() => void moveGoal(goal.id, -centsToPounds(add))}>
                      Take
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <AccountSheet accountId={openAccount} onClose={() => setOpenAccount(null)} />
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
