import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "hearth_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

type SessionPayload = {
  u: string;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "hearth-dev-session");
}

function sign(payload: SessionPayload) {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is missing.");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readSession(token: string | undefined) {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const left = Buffer.from(expected);
  const right = Buffer.from(mac);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.u || payload.exp < Date.now()) return null;
    return payload.u;
  } catch {
    return null;
  }
}

function isHttps(request?: Request) {
  if (process.env.VERCEL === "1" || process.env.SESSION_SECURE === "1") return true;
  if (!request) return false;
  const forwarded = request.headers.get("x-forwarded-proto") ?? "";
  if (forwarded.toLowerCase().includes("https")) return true;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieOptions(request?: Request) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: isHttps(request),
    path: "/",
    maxAge: THIRTY_DAYS,
  };
}

export function withSession(response: NextResponse, username: string, request?: Request) {
  const token = sign({ u: username, exp: Date.now() + THIRTY_DAYS * 1000 });
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(request));
  return response;
}

export function clearSession(response: NextResponse, request?: Request) {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
