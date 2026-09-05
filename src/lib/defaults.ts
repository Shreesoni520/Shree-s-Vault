export const DEFAULT_CATEGORIES = [
  { name: "Pay", kind: "income", color: "#c9a36a" },
  { name: "Side work", kind: "income", color: "#8fbc8f" },
  { name: "Other income", kind: "income", color: "#7ea8b8" },
  { name: "Groceries", kind: "expense", color: "#c9785a" },
  { name: "Eating out", kind: "expense", color: "#d4a017" },
  { name: "Rent", kind: "expense", color: "#8a7a66" },
  { name: "Transport", kind: "expense", color: "#6b8f71" },
  { name: "Bills", kind: "expense", color: "#7b6b9e" },
  { name: "Subscriptions", kind: "expense", color: "#5b7c99" },
  { name: "Fun", kind: "expense", color: "#c47a9a" },
  { name: "Health", kind: "expense", color: "#6a9e8f" },
  { name: "Shopping", kind: "expense", color: "#b07a5a" },
  { name: "Other", kind: "expense", color: "#8d8a7a" },
] as const;

export const AISLES = [
  "Produce",
  "Dairy",
  "Meat",
  "Bakery",
  "Pantry",
  "Frozen",
  "Spices",
  "Household",
  "Other",
] as const;

export const UNITS = ["", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pcs", "pack"] as const;

export type CategoryKind = "income" | "expense";

export const CATEGORY_COLORS = [
  "#c9a36a",
  "#c9785a",
  "#d4a017",
  "#8a7a66",
  "#6b8f71",
  "#7b6b9e",
  "#c47a9a",
  "#6a9e8f",
  "#7ea8b8",
  "#b07a5a",
] as const;
