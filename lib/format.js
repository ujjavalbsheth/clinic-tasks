export const STATUSES   = ["Pending", "In Progress", "Completed", "Delayed"];
export const PRIORITIES = ["Low", "Medium", "High"];

export function taskCode(no) {
  return "TSK-" + String(no).padStart(4, "0");
}

// Plain-language due date. Staff read "2 days overdue" faster than a timestamp.
export function dueLabel(iso) {
  if (!iso) return { text: "No due date", tone: "none" };

  const due = new Date(iso);
  const now = new Date();
  const mins = Math.round((due - now) / 60000);
  const time = due.toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOf(due) - startOf(now)) / 86400000);

  if (mins < 0) {
    const over = Math.abs(days);
    if (over === 0) return { text: "Overdue - was due " + time, tone: "late" };
    if (over === 1) return { text: "1 day overdue", tone: "late" };
    return { text: over + " days overdue", tone: "late" };
  }
  if (days === 0) return { text: "Due today, " + time, tone: "soon" };
  if (days === 1) return { text: "Due tomorrow, " + time, tone: "soon" };
  if (days < 7) {
    const wd = due.toLocaleDateString("en-IN", { weekday: "long" });
    return { text: "Due " + wd + ", " + time, tone: "ok" };
  }
  const dm = due.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return { text: "Due " + dm + ", " + time, tone: "ok" };
}

export function stamp(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// <input type="datetime-local"> needs a local-time string, not an ISO UTC one.
export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
    + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}
