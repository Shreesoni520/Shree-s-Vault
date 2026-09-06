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
  const potTotal = pots.reduce((sum, row) => sum + row.balanceCents, 0);
  const dated =
    kind === "ledger" ? (month ? monthLabel(month) : "All months") : formatDay(todayKey());

  return (
    <article
      className={cn(
        "print-sheet mx-auto w-[210mm] max-w-full bg-white text-neutral-950",
        groceryTight || ledgerTight ? "print-sheet-tight" : "print-sheet-roomy"
      )}
    >
      <header className="print-masthead">
        <div className="flex items-center justify-between gap-4">
          <p className="print-brand">{APP_NAME}</p>
          <p className="print-date">{dated}</p>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <h1 className="font-heading text-[1.65rem] leading-none tracking-tight">
            {kind === "grocery" ? "Grocery list" : kind === "ledger" ? "Ledger" : "Accounts"}
          </h1>
          <p className="print-meta">
            {kind === "grocery" && (items.length ? `${left.length} still to buy` : "Empty list")}
            {kind === "ledger" && `${rows.length} line${rows.length === 1 ? "" : "s"}`}
            {kind === "accounts" && `${pots.length} pot${pots.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      {kind === "grocery" && (
        <div className="mt-5">
          {items.length === 0 && <p className="print-empty">Nothing on the list yet.</p>}
          {left.length > 0 && (
            <section>
              <p className="print-kicker">To buy</p>
              <ul className={cn("print-list", groceryTight && "print-list-split")}>
                {left.map((item) => (
                  <GroceryRow key={item.id} name={item.name} amount={item.estimateCents ? money(item.estimateCents) : ""} />
                ))}
              </ul>
            </section>
          )}
          {bought.length > 0 && (
            <section className="mt-5">
              <p className="print-kicker">Already bought</p>
              <ul className={cn("print-list", groceryTight && "print-list-split")}>
                {bought.map((item) => (
                  <GroceryRow
                    key={item.id}
                    name={item.name}
                    amount={item.estimateCents ? money(item.estimateCents) : ""}
                    done
                  />
                ))}
              </ul>
            </section>
          )}
          {items.length > 0 && (
            <footer className="print-total">
              <div>
                <p className="print-kicker mb-0">Still to buy</p>
                <p className="font-heading mt-1 text-2xl leading-none tracking-tight tabular-nums">
                  {money(leftCents)}
                </p>
              </div>
              {bought.length > 0 && (
                <p className="print-meta">
                  Whole list {money(allCents)}
                </p>
              )}
            </footer>
          )}
        </div>
      )}

      {kind === "ledger" && (
        <div className={cn("mt-5", ledgerTiny && "print-ledger-tiny")}>
          <div className="print-stats">
            <Stat label="In" value={money(income)} />
            <Stat label="Out" value={money(spend)} />
            <Stat label="Left" value={money(income - spend)} emphasize />
          </div>
          {rows.length === 0 && <p className="print-empty">No lines in this range.</p>}
          {(["income", "expense", "transfer"] as const).map((group) => {
            const groupRows = rows.filter((row) => row.kind === group);
            if (!groupRows.length) return null;
            return (
              <section key={group} className="mt-5">
                <p className="print-kicker">{kindLabel(group)}</p>
                <table className="print-table">
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.id}>
                        <td className="print-table-date">{formatDay(row.date)}</td>
                        <td>
                          <span className="font-medium">
                            {row.merchant || row.note || row.category?.name || "Untitled"}
                          </span>
                          {(row.category?.name || row.account?.name) && (
                            <span className="print-sub">
                              {" "}
                              {row.category?.name ?? ""}
                              {row.account?.name ? ` · ${row.account.name}` : ""}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "print-table-amount",
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
        <div className="mt-5">
          <div className="print-stats">
            <Stat label="Pots" value={String(pots.length)} />
            <Stat label="Together" value={money(potTotal)} emphasize />
            {savings.length > 0 && <Stat label="Goals" value={String(savings.length)} />}
          </div>
          <section className="mt-5">
            <p className="print-kicker">Pots</p>
            {pots.length === 0 && <p className="print-empty">No accounts yet.</p>}
            <table className="print-table">
              <tbody>
                {pots.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <span className="print-sub capitalize"> {row.type}</span>
                    </td>
                    <td className="print-table-amount">{money(row.balanceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {savings.length > 0 && (
            <section className="mt-5">
              <p className="print-kicker">Savings goals</p>
              <table className="print-table">
                <tbody>
                  {savings.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td className="print-table-amount">
                        {money(row.savedCents)}
                        <span className="print-sub"> / {money(row.targetCents)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function GroceryRow({ name, amount, done }: { name: string; amount: string; done?: boolean }) {
  return (
    <li className={cn("print-row", done && "print-row-done")}>
      <span className={cn("print-box", done && "print-box-done")}>{done ? "✓" : ""}</span>
      <span className="print-item">
        <span className="print-item-name">{name}</span>
        <span className="print-dots" aria-hidden />
      </span>
      <span className="print-amount">{amount}</span>
    </li>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className={cn("print-stat", emphasize && "print-stat-strong")}>
      <p className="print-kicker mb-0">{label}</p>
      <p className="font-heading mt-1 text-lg leading-none tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
