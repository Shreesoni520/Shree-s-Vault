"use client";

import { useAuth } from "@/context/auth-context";
import { moneySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/money";

export function useMoney() {
  const { user } = useAuth();
  const currency = user?.currency ?? "GBP";
  const symbol = moneySymbol(currency);
  return {
    currency,
    symbol,
    money: (cents: number) => formatMoney(cents, currency),
  };
}
