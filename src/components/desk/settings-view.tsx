"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { downloadExport } from "@/lib/client";
import { useAuth } from "@/context/auth-context";
import { useMoney } from "@/hooks/use-money";
import { CURRENCIES } from "@/lib/currency";
import { centsToPounds, poundsToCents } from "@/lib/money";

async function fileToAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function SettingsView() {
  const { user, updateProfile } = useAuth();
  const { symbol } = useMoney();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "GBP");
  const [salary, setSalary] = useState(user?.salaryCents ? String(centsToPounds(user.salaryCents)) : "");
  const [goal, setGoal] = useState(user?.leftoverGoalCents ? String(centsToPounds(user.leftoverGoalCents)) : "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function save() {
    try {
      const leftoverGoalCents = poundsToCents(goal || "0") ?? 0;
      const salaryCents = poundsToCents(salary || "0") ?? 0;
      await updateProfile({ displayName, leftoverGoalCents, currency, salaryCents });
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const avatar = await fileToAvatar(file);
      await updateProfile({ avatar });
      toast.success("Photo saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save photo");
    }
  }

  async function changePassword() {
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPassword, next: nextPassword, confirm: confirmPassword }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not change password");
      }
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    }
  }

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 lg:py-10">
      <div>
        <p className="text-muted-foreground text-sm">@{user?.username}</p>
        <h1 className="font-heading mt-1 text-4xl tracking-tight lg:text-5xl">You</h1>
      </div>

      <section className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <div className="desk-in flex flex-col items-center text-center lg:items-start lg:text-left">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void onPhoto(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative rounded-full"
            title="Change photo"
          >
            <span className="absolute -inset-1 rounded-full bg-primary/30 blur-md opacity-60 transition group-hover:opacity-90" />
            <UserAvatar
              name={user?.displayName || user?.username || "?"}
              src={user?.avatar}
              className="relative size-28 text-2xl ring-2 ring-primary/30 lg:size-36"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </span>
          </button>
          <p className="font-heading mt-4 text-2xl tracking-tight">{displayName || user?.displayName}</p>
          <p className="text-muted-foreground mt-1 text-sm">Tap the photo to change it</p>
          {user?.avatar ? (
            <button
              type="button"
              className="text-muted-foreground mt-2 text-xs hover:text-foreground"
              onClick={() => void updateProfile({ avatar: "" })}
            >
              Remove photo
            </button>
          ) : null}
        </div>

        <div className="desk-in grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onValueChange={setCurrency}
              options={CURRENCIES.map((item) => ({
                value: item.code,
                label: `${item.symbol}  ${item.code} · ${item.name}`,
              }))}
            />
          </Field>
          <Field label="Monthly pay">
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                {symbol}
              </span>
              <Input value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="0" className="pl-7" />
            </div>
          </Field>
          <Field label="Keep each month">
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                {symbol}
              </span>
              <Input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="0" className="pl-7" />
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Button onClick={() => void save()} className="w-full sm:w-auto">
              Save
            </Button>
          </div>
        </div>
      </section>

      <section className="desk-in">
        <p className="text-muted-foreground mb-1 text-xs tracking-[0.18em] uppercase">Export</p>
        <p className="text-muted-foreground mb-3 text-sm">CSV files Excel can open. Ledger matches Import.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void downloadExport("ledger")
                .then(() => toast.success("Ledger downloaded"))
                .catch((error) => toast.error(error instanceof Error ? error.message : "Could not export"));
            }}
          >
            <Download /> Ledger
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void downloadExport("grocery")
                .then(() => toast.success("Grocery downloaded"))
                .catch((error) => toast.error(error instanceof Error ? error.message : "Could not export"));
            }}
          >
            <Download /> Grocery
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void downloadExport("accounts")
                .then(() => toast.success("Accounts downloaded"))
                .catch((error) => toast.error(error instanceof Error ? error.message : "Could not export"));
            }}
          >
            <Download /> Accounts
          </Button>
        </div>
      </section>

      <section className="desk-in">
        <p className="text-muted-foreground mb-3 text-xs tracking-[0.18em] uppercase">Password</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            type="password"
            placeholder="Current"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="New"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <Button variant="ghost" className="mt-3" onClick={() => void changePassword()}>
          Update password
        </Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </label>
  );
}
