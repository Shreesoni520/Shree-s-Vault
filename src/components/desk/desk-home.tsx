"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Settings,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/desk/dashboard-view";
import { GroceryView } from "@/components/desk/grocery-view";
import { LedgerView } from "@/components/desk/ledger-view";
import { PotsView } from "@/components/desk/pots-view";
import { SettingsView } from "@/components/desk/settings-view";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "desk", label: "Desk", icon: LayoutDashboard },
  { id: "ledger", label: "Ledger", icon: Wallet },
  { id: "pots", label: "Accounts", icon: PiggyBank },
  { id: "grocery", label: "Grocery", icon: ShoppingBasket },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type DeskTab = (typeof NAV)[number]["id"];

export function DeskHome() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<DeskTab>("desk");
  const activeIndex = NAV.findIndex((item) => item.id === tab);

  return (
    <div className="relative flex h-svh max-h-svh w-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />
      <div className="mesh-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="aurora pointer-events-none absolute inset-0 opacity-45" />

      <header className="relative z-20 hidden w-full justify-center px-4 pt-4 pb-2 md:flex">
        <nav
          className="flex w-full max-w-[1080px] items-center gap-2 rounded-full border border-border/80 bg-background/85 py-1.5 pr-2 pl-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl sm:gap-3 sm:px-3.5 dark:bg-[#0c0c0c]/85 dark:shadow-[0_8px_30px_rgb(0,0,0,0.45)]"
          aria-label="Desk"
        >
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-full pr-1"
            onClick={() => setTab("desk")}
          >
            <LogoMark className="size-7" />
            <Wordmark className="hidden text-[13px] lg:inline-flex" />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto">
            {NAV.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                    active ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("settings")}
              className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 hover:bg-foreground/5"
              title="Profile"
            >
              <UserAvatar name={user?.displayName || user?.username || "?"} src={user?.avatar} className="size-7" />
              <span className="hidden max-w-24 truncate text-[12px] font-medium xl:inline">{user?.displayName}</span>
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex size-8 items-center justify-center rounded-full"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LogoMark className="size-7" />
            <Wordmark className="text-sm" />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="custom-scroll relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="grain pointer-events-none absolute inset-0" />
          <div key={tab} className="desk-in relative">
            {tab === "desk" && (
              <DashboardView
                onOpenLedger={() => setTab("ledger")}
                onOpenGrocery={() => setTab("grocery")}
                onOpenPots={() => setTab("pots")}
              />
            )}
            {tab === "ledger" && <LedgerView />}
            {tab === "pots" && <PotsView />}
            {tab === "grocery" && <GroceryView />}
            {tab === "settings" && <SettingsView />}
          </div>
        </main>
        <nav
          className="nav-track relative z-30 grid shrink-0 grid-cols-5 gap-0 border-t border-white/10 bg-card/90 p-1.5 backdrop-blur-xl md:hidden"
          aria-label="Mobile desk"
        >
          <span
            className="nav-glide nav-glide-x"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
            aria-hidden
          />
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "nav-link flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px]",
                  active ? "nav-link-active text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
