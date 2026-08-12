import { NextRequest, NextResponse } from "next/server";
import { adminExists, createAdmin, createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (adminExists()) {
    return NextResponse.json({ error: "admin already configured" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.display_name !== "string" || !body.display_name.trim()) {
    return NextResponse.json({ error: "display_name is required" }, { status: 400 });
  }
  if (typeof body.password !== "string" || body.password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  createAdmin(body.display_name.trim(), body.password);

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return res;
}
