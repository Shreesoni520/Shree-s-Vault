"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
import { ThemeFavicon } from "@/components/theme-favicon";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeFavicon />
      <AuthProvider>
        <div className="flex min-h-svh flex-1 flex-col">{children}</div>
        <Toaster position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}
