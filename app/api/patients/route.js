import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Type-ahead lookup for the assign form.
export async function GET(req) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const { data, error } = await db
    .from("patients")
    .select("id, name, patient_code, phone")
    .or(`name.ilike.%${q}%,patient_code.ilike.%${q}%`)
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Patient name is required." }, { status: 400 });

  const { data, error } = await db
    .from("patients")
    .insert({
      name,
      patient_code: (body.patient_code || "").trim() || null,
      phone: (body.phone || "").trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
