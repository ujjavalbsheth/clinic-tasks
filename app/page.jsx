"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUSES, PRIORITIES, taskCode, dueLabel } from "@/lib/format";

const SPINE = {
  Pending: "var(--rule)",
  "In Progress": "var(--sage)",
  Completed: "#B8C4B8",
  Delayed: "var(--clay)",
};

export default function Dashboard() {
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [assigned, setAssigned] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [hideDone, setHideDone] = useState(true);

  const [me, setMe] = useState("");

  useEffect(() => {
    setMe(localStorage.getItem("clinic_me") || "");
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setStaff(d))
      .catch(() => {});
  }, []);

  // Debounce the search box so typing doesn't fire a query per keystroke.
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (assigned) p.set("assigned", assigned);
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    if (hideDone && status !== "Completed") p.set("open", "1");
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [assigned, status, priority, hideDone, q]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tasks?" + params);
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load tasks.");
        setTasks(data);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [params, router]);

  function pickMe(id) {
    setMe(id);
    localStorage.setItem("clinic_me", id);
    const person = staff.find((s) => s.id === id);
    localStorage.setItem("clinic_me_name", person ? person.name : "");
    setAssigned(id);
  }

  const overdue = tasks.filter(
    (t) => t.status !== "Completed" && t.due_at && new Date(t.due_at) < new Date()
  ).length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-row">
          <h1 className="wordmark">
            White Way <span>Dental</span>
          </h1>
          <span className="eyebrow">
            {overdue > 0 ? `${overdue} overdue` : "All on time"}
          </span>
        </div>

        <input
          className="search"
          placeholder="Search patient, file number, or task"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="filter-scroll">
          <span className="filter-label">Who</span>
          <button className="pill" aria-pressed={assigned === ""} onClick={() => setAssigned("")}>
            Everyone
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              className="pill"
              aria-pressed={assigned === s.id}
              onClick={() => setAssigned(assigned === s.id ? "" : s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="filter-scroll">
          <span className="filter-label">Status</span>
          <button
            className="pill"
            aria-pressed={status === "" && hideDone}
            onClick={() => {
              setStatus("");
              setHideDone(true);
            }}
          >
            Open
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              className="pill"
              aria-pressed={status === s}
              onClick={() => {
                setStatus(status === s ? "" : s);
                setHideDone(false);
              }}
            >
              {s}
            </button>
          ))}
          <span className="filter-label" style={{ paddingLeft: 8 }}>Priority</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              className="pill"
              aria-pressed={priority === p}
              onClick={() => setPriority(priority === p ? "" : p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {!me && staff.length > 0 && (
        <div className="panel" style={{ padding: 15 }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>Who&apos;s using this phone?</div>
          <div className="filter-scroll" style={{ marginTop: 0 }}>
            {staff.map((s) => (
              <button key={s.id} className="pill" onClick={() => pickMe(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            This signs your notes and filters to your tasks first. Change it any time.
          </p>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div style={{ marginTop: 18 }}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Nothing here</h3>
          <p>
            {q || assigned || status || priority
              ? "No task matches these filters. Clear one and look again."
              : "No open tasks. Assign the first one."}
          </p>
          <Link href="/new" className="btn">Assign a task</Link>
        </div>
      ) : (
        <>
          <div className="count">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </div>
          {tasks.map((t) => {
            const due = dueLabel(t.due_at);
            return (
              <Link
                key={t.id}
                href={`/task/${t.id}`}
                className={"card" + (t.status === "Completed" ? " done" : "")}
                style={{ "--spine": SPINE[t.status] }}
              >
                <div className="card-head">
                  <span className="code">{taskCode(t.task_no)}</span>
                  <span className="card-patient">{t.patient_name}</span>
                  {t.patient_code && <span className="code">{t.patient_code}</span>}
                </div>
                <div className="card-desc">{t.description}</div>
                <div className="card-foot">
                  <span className={"tag" + (t.priority === "High" ? " high" : "")}>
                    {t.priority}
                  </span>
                  <span>{t.assigned_name}</span>
                  <span className="dot" />
                  <span className={"due " + due.tone}>{due.text}</span>
                  <span className="dot" />
                  <span>{t.status}</span>
                </div>
              </Link>
            );
          })}
        </>
      )}

      <Link href="/new" className="fab">+ Assign task</Link>
    </div>
  );
}
