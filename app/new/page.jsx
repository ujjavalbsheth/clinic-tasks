"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRIORITIES, toLocalInput } from "@/lib/format";

const QUICK = [
  "Call back for lab results",
  "Confirm tomorrow's appointment",
  "Follow up on insurance approval",
  "Trial appointment reminder",
  "Send prescription on WhatsApp",
  "Collect pending payment",
];

export default function NewTask() {
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState(null);
  const [patientCode, setPatientCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setStaff(d))
      .catch(() => {});

    // Default the deadline to 6pm today — most clinic tasks are same-day.
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    setDueAt(toLocalInput(d));
  }, []);

  // Patient type-ahead against existing records.
  useEffect(() => {
    if (patientId || patientName.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/patients?q=" + encodeURIComponent(patientName));
        const d = await res.json();
        setSuggestions(Array.isArray(d) ? d : []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [patientName, patientId]);

  function choosePatient(p) {
    setPatientId(p.id);
    setPatientName(p.name);
    setPatientCode(p.patient_code || "");
    setSuggestions([]);
  }

  function shiftDue(hours) {
    const base = dueAt ? new Date(dueAt) : new Date();
    base.setHours(base.getHours() + hours);
    setDueAt(toLocalInput(base));
  }

  async function save() {
    setError("");

    if (!patientName.trim()) return setError("Add a patient name.");
    if (!description.trim()) return setError("Describe what needs doing.");
    if (!assignedTo) return setError("Pick who this goes to.");

    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: patientName.trim(),
          patient_code: patientCode.trim() || null,
          description: description.trim(),
          assigned_to: assignedTo,
          priority,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          note: note.trim() || null,
          created_by: localStorage.getItem("clinic_me_name") || "Reception",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the task.");
      router.push("/task/" + data.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-row">
          <h1 className="wordmark" style={{ fontSize: 19 }}>Assign a task</h1>
          <Link href="/" className="back" style={{ margin: 0 }}>Cancel</Link>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="field">
        <label htmlFor="patient">Patient</label>
        <input
          id="patient"
          className="input"
          value={patientName}
          placeholder="Name or file number"
          onChange={(e) => {
            setPatientName(e.target.value);
            setPatientId(null);
          }}
        />
        {suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((p) => (
              <button key={p.id} type="button" onClick={() => choosePatient(p)}>
                {p.name} {p.patient_code && <small>· {p.patient_code}</small>}
              </button>
            ))}
          </div>
        )}
        <div className="hint">
          {patientId
            ? "Linked to an existing patient record."
            : "New name? It saves with the task as typed."}
        </div>
      </div>

      <div className="field">
        <label htmlFor="code">File number (optional)</label>
        <input
          id="code"
          className="input"
          value={patientCode}
          placeholder="e.g. AZS-1042"
          onChange={(e) => setPatientCode(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="desc">What needs doing</label>
        <textarea
          id="desc"
          className="textarea"
          value={description}
          placeholder="Call back with the biopsy report and book a review slot"
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="filter-scroll">
          {QUICK.map((t) => (
            <button key={t} type="button" className="pill" onClick={() => setDescription(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="who">Assign to</label>
        <select
          id="who"
          className="select"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">Choose a staff member</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.role ? " — " + s.role : ""}
            </option>
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
              aria-pressed={priority === p}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="due">Due by</label>
        <input
          id="due"
          className="input"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <div className="filter-scroll">
          <button type="button" className="pill" onClick={() => shiftDue(2)}>+2 hours</button>
          <button type="button" className="pill" onClick={() => shiftDue(24)}>+1 day</button>
          <button type="button" className="pill" onClick={() => shiftDue(72)}>+3 days</button>
          <button type="button" className="pill" onClick={() => setDueAt("")}>No deadline</button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="note">Opening note (optional)</label>
        <textarea
          id="note"
          className="textarea"
          style={{ minHeight: 64 }}
          value={note}
          placeholder="Context the person will need — phone number, what the patient already knows"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button className="btn clay wide" onClick={save} disabled={busy}>
        {busy ? "Saving..." : "Assign task"}
      </button>
    </div>
  );
}
