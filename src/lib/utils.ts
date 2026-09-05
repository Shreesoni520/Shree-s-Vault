import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidUsername(username: string) {
  return /^[a-zA-Z0-9._]{3,20}$/.test(username.trim());
}

export function usernameKey(username: string) {
  return username.trim().toLowerCase();
}

export function avatarInitials(name: string) {
  const cleaned = name.replace(/[._]+/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  const compact = cleaned.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "?";
}
