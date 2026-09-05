export const HOUSEHOLD_BILLS = [
  { key: "rent", label: "Rent", merchant: "Rent", category: "Rent" },
  { key: "light", label: "Light / electric", merchant: "Light bill", category: "Bills" },
  { key: "water", label: "Water", merchant: "Water bill", category: "Bills" },
  { key: "internet", label: "Internet", merchant: "Internet", category: "Bills" },
] as const;

export type HouseholdKey = (typeof HOUSEHOLD_BILLS)[number]["key"];

export const EXAMPLE_MERCHANTS = ["coffee", "cinema", "cafe", "tesco"];
