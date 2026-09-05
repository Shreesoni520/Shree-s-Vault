export function formatQty(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

export function scaleQty(quantity: number, fromServings: number, toServings: number) {
  if (!fromServings) return quantity;
  return (quantity * toServings) / fromServings;
}

export function parseTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
