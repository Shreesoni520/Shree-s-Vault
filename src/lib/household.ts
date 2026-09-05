export const HOUSEHOLD_BILLS = [
  { key: "rent", label: "Rent (per month)", merchant: "Rent", category: "Rent" },
  { key: "light", label: "Light / electric (per month)", merchant: "Light bill", category: "Bills" },
  { key: "water", label: "Water (per month)", merchant: "Water bill", category: "Bills" },
  { key: "internet", label: "Internet (per month)", merchant: "Internet", category: "Bills" },
] as const;

export type HouseholdKey = (typeof HOUSEHOLD_BILLS)[number]["key"];

export function isHouseholdMerchant(merchant: string) {
  const name = merchant.trim().toLowerCase();
  return HOUSEHOLD_BILLS.some((bill) => bill.merchant.toLowerCase() === name);
}

export const EXAMPLE_MERCHANTS = ["coffee", "cinema", "cafe", "tesco"];
