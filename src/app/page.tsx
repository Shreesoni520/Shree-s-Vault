"use client";

import { DeskHome } from "@/components/desk/desk-home";
import { LandingPage } from "@/components/landing-page";
import { Onboarding } from "@/components/onboarding";
import { useAuth } from "@/context/auth-context";

export default function HomePage() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <div className="page-in relative flex min-h-svh items-center justify-center overflow-hidden">
        <div className="aurora pointer-events-none absolute inset-0" />
        <p className="relative text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return <LandingPage />;
  if (!user.onboarded) return <Onboarding />;
  return <DeskHome />;
}
