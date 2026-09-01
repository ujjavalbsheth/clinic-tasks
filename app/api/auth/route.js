import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { passcode } = await req.json();

  if (!passcode || passcode !== process.env.CLINIC_PASSCODE) {
    return NextResponse.json({ error: "That passcode doesn't match." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("clinic_session", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days, so staff sign in about once a month
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("clinic_session", "", { path: "/", maxAge: 0 });
  return res;
}
