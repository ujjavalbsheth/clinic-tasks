import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SELECT = "id, task_no, patient_id, patient_name, patient_code, description, assigned_to, assigned_name, priority, due_at, status, created_by, created_at, updated_at, completed_at";

// GET /api/tasks?assigned=<uuid>&status=Pending&priority=High&q=lab&open=1
export async function GET(req) {
  const p = req.nextUrl.searchParams;
  let query = db.from("tasks").select(SELECT);

  if (p.get("assigned")) query = query.eq("assigned_to", p.get("assigned"));
  if (p.get("status"))   query = query.eq("status", p.get("status"));
  if (p.get("priority")) query = query.eq("priority", p.get("priority"));

  // "open" hides finished work — the default view for a working day.
  if (p.get("open") === "1") query = query.neq("status", "Completed");

  const q = (p.get("q") || "").trim();
  if (q) {
    query = query.or(
      `patient_name.ilike.%${q}%,description.ilike.%${q}%,patient_code.ilike.%${q}%`
    );
  }

  // Overdue and urgent float up; High -> Low, then soonest due date.
  query = query
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(500);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const weight = { High: 0, Medium: 1, Low: 2 };
  const sorted = [...data].sort((a, b) => {
    const aDone = a.status === "Completed" ? 1 : 0;
    const bDone = b.status === "Completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (weight[a.priority] !== weight[b.priority]) return weight[a.priority] - weight[b.priority];
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at) - new Date(b.due_at);
  });

  return NextResponse.json(sorted);
}

export async function POST(req) {
  const b = await req.json();

  const patient_name = (b.patient_name || "").trim();
  const description  = (b.description || "").trim();

  if (!patient_name) return NextResponse.json({ error: "Add a patient name." }, { status: 400 });
  if (!description)  return NextResponse.json({ error: "Describe what needs doing." }, { status: 400 });
  if (!b.assigned_to) return NextResponse.json({ error: "Pick who this goes to." }, { status: 400 });

  const { data: person, error: staffErr } = await db
    .from("staff").select("name").eq("id", b.assigned_to).single();

  if (staffErr || !person) {
    return NextResponse.json({ error: "That staff member no longer exists." }, { status: 400 });
  }

  const row = {
    patient_id:    b.patient_id || null,
    patient_name,
    patient_code:  (b.patient_code || "").trim() || null,
    description,
    assigned_to:   b.assigned_to,
    assigned_name: person.name,
    priority:      b.priority || "Medium",
    due_at:        b.due_at || null,
    status:        b.status || "Pending",
    created_by:    (b.created_by || "").trim() || null,
  };

  const { data, error } = await db.from("tasks").insert(row).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // An opening note is optional but keeps context with the task.
  const note = (b.note || "").trim();
  if (note) {
    await db.from("task_notes").insert({
      task_id: data.id,
      author: row.created_by || "Unsigned",
      body: note,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
