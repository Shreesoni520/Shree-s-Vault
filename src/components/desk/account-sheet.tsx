"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Account, type Transaction } from "@/lib/client";
import { formatDay } from "@/lib/money";
import { useMoney } from "@/hooks/use-money";
import { cn } from "@/lib/utils";

type StatementLine = Transaction & { deltaCents: number; balanceCents: number };

export function AccountSheet({
  accountId,
  onClose,
}: {
  accountId: string | null;
  onClose: () => void;
}) {
  const { money } = useMoney();
  const [account, setAccount] = useState<Account | null>(null);
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    api<{ account: Account; lines: StatementLine[] }>(`/api/accounts/${accountId}`)
      .then((data) => {
        setAccount(data.account);
        setLines(data.lines);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load account"))
      .finally(() => setLoading(false));
  }, [accountId]);

  return (
    <Dialog open={Boolean(accountId)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account?.name ?? "Account"}</DialogTitle>
          <DialogDescription className="capitalize">
            {account?.type ?? "current"} · available {money(account?.balanceCents ?? 0)}
          </DialogDescription>
        </DialogHeader>
        <div className="custom-scroll max-h-[55vh] overflow-y-auto">
          {loading && <p className="text-muted-foreground py-8 text-center text-sm">Loading statement…</p>}
          {!loading && lines.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">No movement on this account yet.</p>
          )}
          {lines.map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {row.kind === "transfer"
                    ? `${row.account?.name ?? "Account"} → ${row.toAccount?.name ?? "Account"}`
                    : row.merchant || row.note || row.category?.name || "Untitled"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDay(row.date)}
                  {row.category?.name ? ` · ${row.category.name}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("text-sm tabular-nums", row.deltaCents > 0 && "text-emerald-400")}>
                  {row.deltaCents > 0 ? "+" : row.deltaCents < 0 ? "−" : ""}
                  {money(Math.abs(row.deltaCents))}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">{money(row.balanceCents)}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
