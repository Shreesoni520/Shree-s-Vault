"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Receipt, Repeat } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { HouseholdBillsDialog } from "@/components/desk/household-bills-dialog";
import { SubscriptionsDialog } from "@/components/desk/subscriptions-dialog";
import { AccountSheet } from "@/components/desk/account-sheet";
import { MonthNav } from "@/components/desk/month-nav";
import { QuickMoneyDialog, type MoneyMode } from "@/components/desk/quick-money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type DeskStats } from "@/lib/client";
import { EXAMPLE_MERCHANTS } from "@/lib/household";
import { formatDay, monthKey } from "@/lib/money";
import { useAuth } from "@/context/auth-context";
import { useMoney } from "@/hooks/use-money";
import { cn } from "@/lib/utils";

export function DashboardView({
  onOpenLedger,
  onOpenGrocery,
  onOpenPots,
}: {
  onOpenLedger: () => void;
  onOpenGrocery: () => void;
  onOpenPots: () => void;
}) {
  const { user } = useAuth();
  const { money, symbol } = useMoney();
  const [month, setMonth] = useState(monthKey());
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [moneyMode, setMoneyMode] = useState<MoneyMode | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [billsOpen, setBillsOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [payee, setPayee] = useState<{ merchant?: string; amount?: string; categoryId?: string }>();

  async function load() {
    setLoading(true);
    try {
      const data = await api<DeskStats>(`/api/stats?month=${month}`);
      setStats(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load desk");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await api("/api/desk/clear-examples", { method: "POST" });
      } catch {
        /* ignore */
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const chart = (stats?.series ?? []).map((row) => ({
    ...row,
    income: row.income / 100,
    spend: row.spend / 100,
  }));

  return (
    <div className="page-in stagger-in mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">
            {greeting()}, {user?.displayName}
          </p>
          <h1 className="font-heading mt-1 text-3xl tracking-tight lg:text-4xl">Available</h1>
          <p className="font-heading mt-2 text-3xl tabular-nums tracking-tight sm:text-4xl lg:text-5xl">
            {loading && !stats ? "…" : money(stats?.cash ?? 0)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Across every account · this month {loading && !stats ? "…" : money(stats?.spend ?? 0)} out
          </p>
        </div>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <ActionButton icon={ArrowUpRight} label="Add spend" onClick={() => { setPayee(undefined); setMoneyMode("pay"); }} />
        <ActionButton icon={Receipt} label="Household bills" onClick={() => setBillsOpen(true)} />
        <ActionButton icon={Repeat} label="Subscriptions" onClick={() => setSubsOpen(true)} />
        <ActionButton icon={ArrowDownLeft} label="Add money" onClick={() => { setPayee(undefined); setMoneyMode("add"); }} />
        <ActionButton icon={ArrowLeftRight} label="Move" onClick={() => { setPayee(undefined); setMoneyMode("move"); }} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(stats?.accounts ?? []).map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => setAccountId(account.id)}
            className="hover-lift rounded-2xl border border-white/10 bg-card/70 p-4 text-left ring-1 ring-foreground/8 backdrop-blur-md"
          >
            <p className="text-muted-foreground text-xs capitalize">{account.type} account</p>
            <p className="mt-1 text-sm font-medium">{account.name}</p>
            <p className="font-heading mt-3 text-2xl tabular-nums">{money(account.balanceCents)}</p>
            <p className="text-muted-foreground mt-1 text-xs">Tap for statement</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="In this month" value={money(stats?.income ?? 0)} hint="Income" />
        <StatCard label="Out this month" value={money(stats?.spend ?? 0)} hint={deltaHint(stats?.spendDelta)} />
        <StatCard
          label="Left over"
          value={money(stats?.saved ?? 0)}
          hint={stats?.leftoverGoalCents ? `Goal ${money(stats.leftoverGoalCents)}` : `${stats?.rate ?? 0}% kept`}
          tone={(stats?.saved ?? 0) >= 0 ? "good" : "warn"}
        />
        <StatCard
          label="Everyday out"
          value={money(stats?.everydaySpend ?? 0)}
          hint="Bills counted once this month"
        />
      </div>

      {(stats?.insights?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(stats?.insights ?? []).slice(0, 3).map((item) => (
            <div
              key={item.text}
              className={cn(
                "hover-lift rounded-xl border px-4 py-3 text-sm leading-6",
                item.tone === "warn" && "border-destructive/30 bg-destructive/5",
                item.tone === "good" && "border-emerald-500/20 bg-emerald-500/5",
                item.tone === "info" && "bg-card/70"
              )}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}

      <Payees
        onPay={(item) => {
          setPayee(item);
          setMoneyMode("pay");
        }}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Income vs spend</CardTitle>
            <CardDescription>Last six months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {loading || chart.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {loading ? "Loading chart…" : "Add a few months of lines to see the curve."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${symbol}${value}`}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${symbol}${Number(value).toFixed(2)}`, name === "income" ? "Income" : "Spend"]}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Area type="monotone" dataKey="income" name="income" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.22} />
                  <Area type="monotone" dataKey="spend" name="spend" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Where it went</CardTitle>
            <CardDescription>Top spend this month</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(stats?.topCategories.length ? stats.topCategories : [{ name: "No spend yet", color: "#8d8a7a", cents: 0 }]).map(
              (row) => {
                const max = stats?.topCategories[0]?.cents || 1;
                return (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: row.color }} />
                        {row.name}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{money(row.cents)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(6, (row.cents / max) * 100)}%`, background: row.color }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Latest on your accounts</CardDescription>
            </div>
            <Button variant="outline" onClick={onOpenLedger}>
              Full ledger
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {(stats?.recent ?? []).length === 0 && (
              <div className="py-6 text-center">
                <p className="text-muted-foreground text-sm">Nothing yet. You add every line yourself.</p>
                <Button className="mt-3" onClick={() => { setPayee(undefined); setMoneyMode("pay"); }}>
                  Add spend
                </Button>
              </div>
            )}
            {(stats?.recent ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="size-2.5 rounded-full" style={{ background: row.category?.color ?? "#8d8a7a" }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{row.merchant || row.note || row.category?.name || "Untitled"}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDay(row.date)} · {row.account?.name ?? row.category?.name ?? "Account"}
                    </p>
                  </div>
                </div>
                <span className={cn("text-sm tabular-nums", row.kind === "income" && "text-emerald-400")}>
                  {row.kind === "income" ? "+" : row.kind === "transfer" ? "→" : "−"}
                  {money(row.amountCents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Household bills</CardTitle>
              <CardDescription>Rent and home bills. Once a month, not weekly.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(stats?.bills ?? []).length === 0 && (
                <p className="text-muted-foreground text-sm">No monthly bills yet. Add rent, light, or water when you have them.</p>
              )}
              {(stats?.bills ?? []).slice(0, 8).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {bill.merchant}
                    <span className="text-muted-foreground ml-2 text-xs">every month</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{money(bill.amountCents)}</span>
                </div>
              ))}
              <Button variant="outline" className="mt-2" onClick={() => setBillsOpen(true)}>
                Edit bills
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Netflix, gym, phone. Same amount once a month.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(stats?.subscriptions ?? []).length === 0 && (
                <p className="text-muted-foreground text-sm">No subscriptions yet. Add ones that come every month.</p>
              )}
              {(stats?.subscriptions ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {item.merchant}
                    <span className="text-muted-foreground ml-2 text-xs">every month</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{money(item.amountCents)}</span>
                </div>
              ))}
              <Button variant="outline" className="mt-2" onClick={() => setSubsOpen(true)}>
                {(stats?.subscriptions ?? []).length ? "Edit subscriptions" : "Add subscription"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
        <button type="button" className="hover:text-foreground" onClick={onOpenPots}>
          Accounts
        </button>
        <button type="button" className="hover:text-foreground" onClick={onOpenGrocery}>
          Grocery
        </button>
      </div>

      <QuickMoneyDialog
        open={moneyMode !== null}
        mode={moneyMode ?? "pay"}
        accounts={stats?.accounts ?? []}
        preset={payee}
        onOpenChange={(open) => {
          if (!open) setMoneyMode(null);
        }}
        onSaved={load}
      />
      <HouseholdBillsDialog
        open={billsOpen}
        bills={stats?.bills ?? []}
        onOpenChange={setBillsOpen}
        onSaved={load}
      />
      <SubscriptionsDialog
        open={subsOpen}
        items={stats?.subscriptions ?? []}
        onOpenChange={setSubsOpen}
        onSaved={load}
      />
      <AccountSheet accountId={accountId} onClose={() => setAccountId(null)} />
    </div>
  );

}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-lift flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-card/70 px-3 py-3 text-left text-xs ring-1 ring-foreground/8 backdrop-blur-md sm:text-sm"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function Payees({
  onPay,
}: {
  onPay: (item: { merchant?: string; amount?: string; categoryId?: string }) => void;
}) {
  const { money } = useMoney();
  const [payees, setPayees] = useState<
    { name: string; lastCents: number; kind: string; categoryId: string | null; count: number }[]
  >([]);

  useEffect(() => {
    api<{ payees: typeof payees }>("/api/payees")
      .then((data) =>
        setPayees(
          data.payees.filter(
            (item) => item.kind === "expense" && !EXAMPLE_MERCHANTS.includes(item.name.trim().toLowerCase())
          ).slice(0, 8)
        )
      )
      .catch(() => undefined);
  }, []);

  if (!payees.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>People and shops</CardTitle>
        <CardDescription>Pay again in one tap</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {payees.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() =>
              onPay({
                merchant: item.name,
                amount: String(item.lastCents / 100),
                categoryId: item.categoryId ?? undefined,
              })
            }
            className="chip-pop rounded-full border px-3 py-1.5 text-sm hover:bg-muted/50"
          >
            {item.name}
            <span className="text-muted-foreground ml-2 tabular-nums">{money(item.lastCents)}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "warn";
}) {
  return (
    <Card size="sm" className="hover-lift min-w-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "font-heading truncate text-2xl tabular-nums",
            tone === "good" && "text-emerald-400",
            tone === "warn" && "text-destructive"
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground truncate text-xs">{hint}</CardContent>
    </Card>
  );
}

function deltaHint(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return "No last-month compare yet";
  if (delta === 0) return "Same as last month";
  return delta > 0 ? `${delta}% more than last month` : `${Math.abs(delta)}% less than last month`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
