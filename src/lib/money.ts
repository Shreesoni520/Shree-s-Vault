import { currencyMeta } from "@/lib/currency";

export function poundsToCents(value: string | number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  let raw = String(value).trim().replace(/[£€$₹\s]/g, "");
  if (!raw) return null;
  if (raw.includes(",") && raw.includes(".")) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else {
      raw = raw.replace(/,/g, "");
    }
  } else if (raw.includes(",")) {
    raw = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function centsToPounds(cents: number) {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "GBP") {
  const meta = currencyMeta(currency);
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return `${sign}${meta.symbol}${(abs / 100).toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function monthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function todayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1 + delta, 1);
  return monthKey(date);
}

export function lastNMonths(n: number, from = monthKey()) {
  return Array.from({ length: n }, (_, i) => shiftMonth(from, i - (n - 1)));
}

export function formatDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleString("en-GB", { day: "numeric", month: "short" });
}

export function monthShort(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleString("en-GB", { month: "short" });
}

export function kindLabel(kind: string) {
  if (kind === "income") return "Income";
  if (kind === "transfer") return "Move";
  return "Spend";
}

export function daysInMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7));
  return new Date(year, monthIndex, 0).getDate();
}

export function daysElapsedInMonth(month: string, now = new Date()) {
  const current = monthKey(now);
  const total = daysInMonth(month);
  if (month < current) return total;
  if (month > current) return 1;
  return Math.max(1, Math.min(total, now.getDate()));
}

export function dateInMonth(sourceDate: string, month: string) {
  const day = Number(sourceDate.slice(8, 10)) || 1;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7));
  const last = new Date(year, monthIndex, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function weekDates(from = new Date()) {
  const start = new Date(from);
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    return todayKey(next);
  });
}

export function weekdayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day).toLocaleString("en-GB", { weekday: "short" });
}
