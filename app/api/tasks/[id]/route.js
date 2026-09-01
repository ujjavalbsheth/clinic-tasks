import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SELECT = "id, task_no, patient_id, patient_name, patient_code, description, assigned_to, assigned_name, priority, due_at, status, created_by, created_at, updated_at, completed_at";

export async function GET(_req, { params }) {
  const { id } = params;

  const { data: task, error } = await db.from("tasks").select(SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const { data: notes } = await db
    .from("task_notes")
    .select("id, author, body, created_at")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ...task, notes: notes || [] });
}

// PATCH handles the two things staff actually do: change status, add a note.
// It also accepts full edits so admin can reassign or move a due date.
export async function PATCH(req, { params }) {
  const { id } = params;
  const b = await req.json();
  const patch = {};

  if (b.status)   patch.status = b.status;
  if (b.priority) patch.priority = b.priority;
  if (b.due_at !== undefined) patch.due_at = b.due_at || null;
  if (b.description) patch.description = b.description.trim();

  if (b.assigned_to) {
    const { data: person } = await db.from("staff").select("name").eq("id", b.assigned_to).single();
    if (!person) return NextResponse.json({ error: "That staff member no longer exists." }, { status: 400 });
    patch.assigned_to = b.assigned_to;
    patch.assigned_name = person.name;
  }

  if (Object.keys(patch).length) {
    const { error } = await db.from("tasks").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const note = (b.note || "").trim();
  if (note) {
    const { error } = await db.from("task_notes").insert({
      task_id: id,
      author: (b.author || "").trim() || "Unsigned",
      body: note,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: task } = await db.from("tasks").select(SELECT).eq("id", id).single();
  const { data: notes } = await db
    .from("task_notes")
    .select("id, author, body, created_at")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ...task, notes: notes || [] });
}

export async function DELETE(_req, { params }) {
  const { error } = await db.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
