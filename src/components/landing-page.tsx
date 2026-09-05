"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Wordmark } from "@/components/logo";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="mesh-grid pointer-events-none absolute inset-0" />
      <div className="aurora pointer-events-none absolute inset-0" />
      <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-px" />

      <header className="relative z-20 flex justify-center px-4 pt-5">
        <nav className="glass-nav flex w-full max-w-3xl items-center justify-between gap-3 rounded-full px-2 py-2 pl-4 sm:px-3">
          <button type="button" className="flex items-center gap-2 text-sm font-semibold" onClick={() => window.location.reload()}>
            <LogoMark className="size-8" />
            <Wordmark className="hidden text-sm sm:inline-flex" />
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}>
              Sign in
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
              Start
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-5 pb-20 pt-16 sm:pt-24">
        <p className="hero-kicker text-muted-foreground text-xs tracking-[0.32em] uppercase">Shree · private finance</p>
        <h1 className="hero-title font-heading mt-4 max-w-3xl text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Money that actually
          <span className="text-gradient block">belongs to you.</span>
        </h1>
        <p className="hero-copy text-muted-foreground mt-6 max-w-xl text-base leading-7 sm:text-lg">
          Sign up, pick a currency, add your pay, then log what you spend. Nothing is invented for you.
        </p>
        <div className="hero-cta mt-9 flex flex-wrap gap-3">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7")}>
            Create an account
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full px-7")}>
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Ledger", copy: "Income, spend, envelopes, and your currency." },
            { label: "Accounts", copy: "Everyday, savings, statements, bills you edit." },
            { label: "Kitchen", copy: "Recipes that scale, then a grocery list that shops." },
          ].map((item, index) => (
            <div
              key={item.label}
              className="lift-card rounded-3xl border border-white/10 bg-card/40 p-5 backdrop-blur-xl"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <p className="font-heading text-2xl">{item.label}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{item.copy}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
