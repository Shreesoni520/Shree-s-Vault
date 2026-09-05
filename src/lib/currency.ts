export const CURRENCIES = [
  { code: "GBP", symbol: "£", name: "Pound sterling", locale: "en-GB" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "USD", symbol: "$", name: "US dollar", locale: "en-US" },
  { code: "INR", symbol: "₹", name: "Indian rupee", locale: "en-IN" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function isCurrency(value: string | undefined | null): value is CurrencyCode {
  return CURRENCIES.some((item) => item.code === value);
}

export function currencyMeta(code: string | undefined | null) {
  return CURRENCIES.find((item) => item.code === code) ?? CURRENCIES[0];
}

export function moneySymbol(code: string | undefined | null) {
  return currencyMeta(code).symbol;
}
