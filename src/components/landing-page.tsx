"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Wordmark } from "@/components/logo";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden bg-background sm:h-svh sm:overflow-hidden">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="mesh-grid pointer-events-none absolute inset-0" />
      <div className="aurora pointer-events-none absolute inset-0" />
      <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-px" />

      <header className="relative z-20 flex shrink-0 justify-center px-4 pt-3 sm:pt-4">
        <nav className="glass-nav flex w-full max-w-3xl items-center justify-between gap-3 rounded-full px-2 py-1.5 pl-3 sm:px-3 sm:py-2 sm:pl-4">
          <button type="button" className="flex items-center gap-2 text-sm font-semibold" onClick={() => window.location.reload()}>
            <LogoMark className="size-7 sm:size-8" />
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

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-5 py-4 sm:gap-10 sm:py-6">
        <section>
          <p className="hero-kicker text-muted-foreground text-[10px] tracking-[0.28em] uppercase sm:text-xs sm:tracking-[0.32em]">
            Shree · private finance
          </p>
          <h1 className="hero-title font-heading mt-2 max-w-3xl text-4xl leading-[1.05] tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
            Money that actually
            <span className="text-gradient block">belongs to you.</span>
          </h1>
          <p className="hero-copy text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:mt-4 sm:text-base sm:leading-7">
            Sign up, pick a currency, add your pay, then log what you spend. Nothing is invented for you.
          </p>
          <div className="hero-cta mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6 sm:px-7")}>
              Create an account
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full px-6 sm:px-7")}>
              Sign in
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: "Ledger", copy: "Income, spend, envelopes, and your currency." },
            { label: "Accounts", copy: "Everyday, savings, statements, bills you edit." },
            { label: "Grocery", copy: "Monthly items and prices, so food spend stays clear." },
          ].map((item, index) => (
            <div
              key={item.label}
              className="lift-card rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-xl sm:rounded-3xl sm:p-5"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <p className="font-heading text-xl sm:text-2xl">{item.label}</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-5 sm:mt-2 sm:leading-6">{item.copy}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
