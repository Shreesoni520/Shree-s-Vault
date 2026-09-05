"use client";

import { useEffect, useState } from "react";
import { Flame, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

function isPhone() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  return false;
}

export function DesktopGate({ children }: { children: React.ReactNode }) {
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  useEffect(() => {
    setDeviceBlocked(isPhone());
  }, []);

  return (
    <>
      <div className={cn(deviceBlocked ? "hidden" : "flex h-svh max-h-svh flex-col overflow-hidden max-md:hidden")}>
        {children}
      </div>
      <div
        className={cn(
          "min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-center",
          deviceBlocked ? "flex" : "hidden max-md:flex"
        )}
      >
        <div className="mb-8 flex items-center gap-2 text-sm font-medium">
          <Flame className="size-4" />
          Hearth
        </div>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border bg-card">
          <Monitor className="size-6" />
        </div>
        <p className="text-muted-foreground mb-3 text-sm">Not for phones</p>
        <h1 className="font-heading max-w-md text-3xl font-medium tracking-tight sm:text-4xl">
          This desk needs a bigger screen.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-md text-base leading-7">
          Hearth is built for a tablet, laptop, or desktop browser. Phones are too narrow for the
          ledger, charts, and recipe cards.
        </p>
        <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
          Open this site on an iPad, a Windows PC, a Mac, or another large screen. There is no
          phone app.
        </p>
      </div>
    </>
  );
}
