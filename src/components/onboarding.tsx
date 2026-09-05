"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { CURRENCIES, moneySymbol } from "@/lib/currency";
import { HOUSEHOLD_BILLS } from "@/lib/household";
import { cn } from "@/lib/utils";

const STEPS = ["Currency", "Pay", "Cash", "Bills", "Goal"] as const;

export function Onboarding() {
  const { user, completeOnboard, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState(user?.currency && user.currency !== "GBP" ? user.currency : "GBP");
  const [salary, setSalary] = useState("");
  const [opening, setOpening] = useState("");
  const [leftoverGoal, setLeftoverGoal] = useState("");
  const [bills, setBills] = useState({ rent: "", light: "", water: "", internet: "" });
  const [saving, setSaving] = useState(false);
  const symbol = moneySymbol(currency);

  async function finish() {
    setSaving(true);
    try {
      await completeOnboard({
        currency,
        salary,
        leftoverGoal,
        opening,
        displayName: user?.displayName,
        ...bills,
      });
      toast.success("Your desk is ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="mesh-grid pointer-events-none absolute inset-0" />
      <div className="aurora pointer-events-none absolute inset-0" />
      <div className="grain pointer-events-none absolute inset-0" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LogoMark className="size-8" />
          <Wordmark className="text-sm" />
        </div>
        <button type="button" className="text-muted-foreground text-sm hover:text-foreground" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-16 sm:px-8">
        <p className="text-muted-foreground text-sm">Answer these once. Nothing else is invented.</p>
        <h1 className="font-heading mt-2 text-4xl tracking-tight sm:text-5xl">Set up your money.</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">
          Cinema, coffee, and shops stay empty until you add them. Household bills only appear if you type an amount.
        </p>

        <div className="mt-8 flex gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex-1">
              <div className={cn("h-1 rounded-full", index <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-2 text-[11px]", index === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <div key={step} className="desk-in mt-8 rounded-3xl border border-white/10 bg-card/60 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          {step === 0 && (
            <div>
              <h2 className="font-heading text-2xl">Which currency?</h2>
              <p className="text-muted-foreground mt-1 text-sm">Every amount will use this symbol.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {CURRENCIES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setCurrency(item.code)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5",
                      currency === item.code
                        ? "border-primary bg-primary/10 shadow-[0_0_24px_-8px_var(--primary)]"
                        : "border-white/10 bg-background/40"
                    )}
                  >
                    <p className="text-2xl">{item.symbol}</p>
                    <p className="mt-1 text-sm font-medium">{item.code}</p>
                    <p className="text-muted-foreground text-xs">{item.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-heading text-2xl">What do you get paid?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Monthly take-home. Leave blank to add pay later. This becomes repeating income you can edit any time.
              </p>
              <Label className="mt-5">Monthly pay</Label>
              <div className="relative mt-2">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  {symbol}
                </span>
                <Input
                  inputMode="decimal"
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                  placeholder="0"
                  className="h-12 pl-7 text-lg"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-heading text-2xl">Cash on hand today?</h2>
              <p className="text-muted-foreground mt-1 text-sm">Opening for Everyday. Zero is fine.</p>
              <Label className="mt-5">Everyday opening</Label>
              <div className="relative mt-2">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  {symbol}
                </span>
                <Input
                  inputMode="decimal"
                  value={opening}
                  onChange={(event) => setOpening(event.target.value)}
                  placeholder="0"
                  className="h-12 pl-7 text-lg"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-heading text-2xl">Household bills?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Only fill what you actually pay. Leave blank if you do not have that bill. You can change the amount
                later when the price goes up.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {HOUSEHOLD_BILLS.map((bill) => (
                  <div key={bill.key} className="flex flex-col gap-1.5">
                    <Label>{bill.label}</Label>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                        {symbol}
                      </span>
                      <Input
                        inputMode="decimal"
                        value={bills[bill.key]}
                        onChange={(event) => setBills((current) => ({ ...current, [bill.key]: event.target.value }))}
                        placeholder="Skip"
                        className="pl-7"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-heading text-2xl">How much to keep?</h2>
              <p className="text-muted-foreground mt-1 text-sm">Optional leftover goal each month.</p>
              <Label className="mt-5">Monthly leftover goal</Label>
              <div className="relative mt-2">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  {symbol}
                </span>
                <Input
                  inputMode="decimal"
                  value={leftoverGoal}
                  onChange={(event) => setLeftoverGoal(event.target.value)}
                  placeholder="0"
                  className="h-12 pl-7 text-lg"
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((value) => value - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" className="flex-1" onClick={() => setStep((value) => value + 1)}>
                Continue
              </Button>
            ) : (
              <Button type="button" className="flex-1" disabled={saving} onClick={() => void finish()}>
                {saving ? "Saving…" : "Open the desk"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
