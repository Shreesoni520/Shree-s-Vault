"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Wordmark } from "@/components/logo";
import { useAuth } from "@/context/auth-context";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(username, password);
      else await register(username, password, confirm);
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-in relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="mesh-grid pointer-events-none absolute inset-0" />
      <div className="aurora pointer-events-none absolute inset-0" />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <form
        method="post"
        action="#"
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-card/40 p-6 shadow-2xl backdrop-blur-xl"
      >
        <Link href="/" className="text-muted-foreground mb-5 flex items-center gap-2 text-sm hover:text-foreground">
          <LogoMark className="size-7" />
          <Wordmark className="text-sm" />
        </Link>
        <h1 className="font-heading text-3xl tracking-tight">{isLogin ? "Sign in" : "Create account"}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {isLogin
            ? "Welcome back. Use the username and password you created."
            : "Pick a username and password. You can sign in again anytime."}
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Please wait..." : isLogin ? "Sign in" : "Sign up"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            {isLogin ? (
              <>
                New here?{" "}
                <Link href="/register" className="text-foreground font-medium underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
