"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { STATUSES, PRIORITIES, taskCode, dueLabel, stamp, toLocalInput } from "@/lib/format";

export default function TaskDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/staff").then((r) => r.json()).then((d) => Array.isArray(d) && setStaff(d)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tasks/" + id);
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Task not found.");
        setTask(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function patch(body, successMsg) {
    setError("");
    try {
      const res = await fetch("/api/tasks/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          author: localStorage.getItem("clinic_me_name") || "Unsigned",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the change.");
      setTask(data);
      if (successMsg) flash(successMsg);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    const ok = await patch({ note }, "Note added");
    if (ok) setNote("");
  }

  async function remove() {
    if (!confirm("Delete this task permanently? Notes go with it.")) return;
    const res = await fetch("/api/tasks/" + id, { method: "DELETE" });
    if (res.ok) router.push("/");
    else setError("Could not delete the task.");
  }

  if (loading) {
    return (
      <div className="shell" style={{ paddingTop: 24 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="shell" style={{ paddingTop: 24 }}>
        <Link href="/" className="back">← All tasks</Link>
        <div className="error">{error || "Task not found."}</div>
      </div>
    );
  }

  const due = dueLabel(task.due_at);

  return (
    <div className="shell" style={{ paddingTop: 18 }}>
      <Link href="/" className="back">← All tasks</Link>

      {error && <div className="error">{error}</div>}

      <div className="panel">
        <div className="code">{taskCode(task.task_no)}</div>
        <h2 style={{ fontSize: 21, margin: "6px 0 4px" }}>{task.patient_name}</h2>
        <p style={{ fontSize: 16, margin: "0 0 4px" }}>{task.description}</p>
        <div className={"due " + due.tone} style={{ fontSize: 14 }}>{due.text}</div>

        <dl className="meta">
          <dt>Assigned to</dt>
          <dd>{task.assigned_name}</dd>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
          {task.patient_code && (<><dt>File no.</dt><dd>{task.patient_code}</dd></>)}
          <dt>Raised by</dt>
          <dd>{task.created_by || "—"} · {stamp(task.created_at)}</dd>
          {task.completed_at && (<><dt>Completed</dt><dd>{stamp(task.completed_at)}</dd></>)}
        </dl>
      </div>

      <div className="panel">
        <h3 className="section-title">Status</h3>
        <div className="seg" style={{ flexWrap: "wrap", gap: 7 }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={task.status === s}
              style={{ flex: "1 1 44%" }}
              onClick={() => patch({ status: s }, "Marked " + s.toLowerCase())}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="section-title">
          Notes {task.notes.length > 0 && <span className="code">({task.notes.length})</span>}
        </h3>

        {task.notes.length === 0 ? (
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            No notes yet. Record what happened so the next person isn&apos;t guessing.
          </p>
        ) : (
          task.notes.map((n) => (
            <div key={n.id} className="note">
              <div className="note-head">
                <b>{n.author}</b> · {stamp(n.created_at)}
              </div>
              <div className="note-body">{n.body}</div>
            </div>
          ))
        )}

        <textarea
          className="textarea"
          style={{ minHeight: 68 }}
          value={note}
          placeholder="Patient didn't pick up, trying again after 4pm"
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn wide" style={{ marginTop: 9 }} onClick={addNote} disabled={!note.trim()}>
          Add note
        </button>
      </div>

      <div className="panel">
        <button
          className="btn ghost wide"
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
        >
          {editing ? "Hide details" : "Edit details"}
        </button>

        {editing && (
          <div style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="reassign">Assign to</label>
              <select
                id="reassign"
                className="select"
                value={task.assigned_to || ""}
                onChange={(e) => patch({ assigned_to: e.target.value }, "Reassigned")}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Priority</label>
              <div className="seg priority">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-v={p}
                    aria-pressed={task.priority === p}
                    onClick={() => patch({ priority: p }, "Priority updated")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="newdue">Due by</label>
              <input
                id="newdue"
                className="input"
                type="datetime-local"
                defaultValue={task.due_at ? toLocalInput(new Date(task.due_at)) : ""}
                onChange={(e) =>
                  patch(
                    { due_at: e.target.value ? new Date(e.target.value).toISOString() : null },
                    "Deadline moved"
                  )
                }
              />
            </div>

            <button className="btn ghost wide" style={{ color: "var(--clay)" }} onClick={remove}>
              Delete task
            </button>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
