"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!passcode.trim()) return;
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Sign in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 380, paddingTop: "16vh" }}>
      <h1 className="wordmark" style={{ fontSize: 26, marginBottom: 6 }}>
        Clinic <span>Tasks</span>
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 0, marginBottom: 28 }}>
        Enter the clinic passcode to see today&apos;s work.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="field">
        <label htmlFor="pass">Passcode</label>
        <input
          id="pass"
          className="input"
          type="password"
          value={passcode}
          autoComplete="current-password"
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />
      </div>

      <button className="btn wide" onClick={signIn} disabled={busy}>
        {busy ? "Checking..." : "Sign in"}
      </button>
    </div>
  );
}
