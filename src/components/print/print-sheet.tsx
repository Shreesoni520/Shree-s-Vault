import { APP_NAME } from "@/lib/brand";
import { formatDay, formatMoney, kindLabel, monthLabel, todayKey } from "@/lib/money";
import type { Account, Goal, GroceryItem, Transaction } from "@/lib/client";
import { cn } from "@/lib/utils";

export function PrintSheet({
  kind,
  currency,
  month,
  grocery,
  ledger,
  accounts,
  goals,
}: {
  kind: "grocery" | "ledger" | "accounts";
  currency: string;
  month?: string;
  grocery?: GroceryItem[];
  ledger?: Transaction[];
  accounts?: Account[];
  goals?: Goal[];
}) {
  const money = (cents: number) => formatMoney(cents, currency);
  const items = grocery ?? [];
  const left = items.filter((item) => !item.done);
  const bought = items.filter((item) => item.done);
  const leftCents = left.reduce((sum, item) => sum + item.estimateCents, 0);
  const allCents = items.reduce((sum, item) => sum + item.estimateCents, 0);
  const groceryTight = left.length + bought.length >= 12;
  const rows = ledger ?? [];
  const income = rows.filter((row) => row.kind === "income").reduce((sum, row) => sum + row.amountCents, 0);
  const spend = rows.filter((row) => row.kind === "expense").reduce((sum, row) => sum + row.amountCents, 0);
  const ledgerTight = rows.length >= 20;
  const ledgerTiny = rows.length >= 36;
  const pots = accounts ?? [];
  const savings = goals ?? [];

  return (
    <article
      className={cn(
        "print-sheet mx-auto w-[210mm] max-w-full bg-white text-black",
        groceryTight || ledgerTight ? "print-sheet-tight" : "print-sheet-roomy"
      )}
    >
      <header className="flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase">{APP_NAME}</p>
          <h1 className="font-heading mt-0.5 text-2xl leading-none tracking-tight">
            {kind === "grocery" ? "Grocery list" : kind === "ledger" ? "Ledger" : "Accounts"}
          </h1>
        </div>
        <p className="text-right text-xs leading-5">
          {kind === "ledger" ? (month ? monthLabel(month) : "All months") : formatDay(todayKey())}
          <br />
          {kind === "grocery" && (
            <>
              {left.length} to buy · {money(leftCents)}
            </>
          )}
          {kind === "ledger" && (
            <>
              In {money(income)} · Out {money(spend)}
            </>
          )}
          {kind === "accounts" && <>{pots.length} pots</>}
        </p>
      </header>

      {kind === "grocery" && (
        <div className="mt-3">
          {items.length === 0 && <p className="text-sm">Nothing on the list yet.</p>}
          {left.length > 0 && (
            <ul className={cn("print-list", groceryTight && "print-list-split")}>
              {left.map((item) => (
                <li key={item.id} className="print-row">
                  <span className="print-box" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="tabular-nums">{item.estimateCents ? money(item.estimateCents) : ""}</span>
                </li>
              ))}
            </ul>
          )}
          {bought.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] tracking-[0.18em] uppercase">Already bought</p>
              <ul className={cn("print-list", groceryTight && "print-list-split")}>
                {bought.map((item) => (
                  <li key={item.id} className="print-row print-row-done">
                    <span className="print-box print-box-done">✓</span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="tabular-nums">{item.estimateCents ? money(item.estimateCents) : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {items.length > 0 && (
            <footer className="mt-3 flex justify-between border-t border-black pt-2 text-sm font-medium">
              <span>Still to buy</span>
              <span className="tabular-nums">{money(leftCents)}</span>
            </footer>
          )}
          {bought.length > 0 && (
            <p className="mt-1 text-right text-xs">
              Whole list {money(allCents)}
            </p>
          )}
        </div>
      )}

      {kind === "ledger" && (
        <div className={cn("mt-3", ledgerTiny && "print-ledger-tiny")}>
          <div className="mb-2 grid grid-cols-3 gap-2 text-sm">
            <p>In {money(income)}</p>
            <p>Out {money(spend)}</p>
            <p className="text-right">Left {money(income - spend)}</p>
          </div>
          {rows.length === 0 && <p className="text-sm">No lines in this range.</p>}
          {(["income", "expense", "transfer"] as const).map((group) => {
            const groupRows = rows.filter((row) => row.kind === group);
            if (!groupRows.length) return null;
            return (
              <section key={group} className="mt-2">
                <p className="mb-1 text-[10px] tracking-[0.18em] uppercase">{kindLabel(group)}</p>
                <table className="w-full border-collapse text-[12px]">
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.id} className="border-b border-neutral-300">
                        <td className="w-16 py-1 align-top whitespace-nowrap">{formatDay(row.date)}</td>
                        <td className="py-1 align-top">
                          <span className="font-medium">{row.merchant || row.note || row.category?.name || "Untitled"}</span>
                          {(row.category?.name || row.account?.name) && (
                            <span className="ml-1 text-neutral-600">
                              · {row.category?.name ?? ""}
                              {row.account?.name ? ` · ${row.account.name}` : ""}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "w-24 py-1 text-right align-top tabular-nums whitespace-nowrap",
                            row.kind === "income" && "font-medium"
                          )}
                        >
                          {row.kind === "income" ? "+" : row.kind === "transfer" ? "→" : "−"}
                          {money(row.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}

      {kind === "accounts" && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] tracking-[0.18em] uppercase">Pots</p>
          {pots.length === 0 && <p className="text-sm">No accounts yet.</p>}
          <table className="w-full border-collapse text-sm">
            <tbody>
              {pots.map((row) => (
                <tr key={row.id} className="border-b border-neutral-300">
                  <td className="py-1.5">
                    {row.name}
                    <span className="ml-1 text-neutral-600 capitalize">· {row.type}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{money(row.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {savings.length > 0 && (
            <>
              <p className="mt-4 mb-1 text-[10px] tracking-[0.18em] uppercase">Savings goals</p>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {savings.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-300">
                      <td className="py-1.5">{row.name}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {money(row.savedCents)} / {money(row.targetCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </article>
  );
}
