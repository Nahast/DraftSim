"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rememberDraft } from "@/lib/storage";

const EXPERIENCE = [
  { id: "never", label: "I've never played", note: "We pick the settings and explain everything" },
  { id: "bit", label: "I've played a bit", note: "Plain language, with shortcuts" },
  { id: "pro", label: "I play every year", note: "Dense table, no hand-holding" },
] as const;

const APPS = [
  { id: "espn", label: "ESPN", note: "" },
  { id: "yahoo", label: "Yahoo", note: "" },
  { id: "sleeper", label: "Sleeper", note: "Live sync is coming. For now, enter picks by hand." },
  { id: "other", label: "Other", note: "" },
  { id: "idk", label: "I don't know", note: "We'll use standard rules" },
] as const;

type Experience = (typeof EXPERIENCE)[number]["id"];
type App = (typeof APPS)[number]["id"];

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <button type="button" className="tbtn" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output className="w-12 text-center font-display text-4xl font-bold" aria-live="polite">{value}</output>
      <button type="button" className="tbtn" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [exp, setExp] = useState<Experience | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [teams, setTeams] = useState(12);
  const [slot, setSlot] = useState<number | null>(null); // null until they choose: we guess the middle
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mySlot = Math.min(slot ?? Math.ceil(teams / 2), teams);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sport: "NFL",
          experience: exp === "pro" ? "PRO" : "BEGINNER",
          app: app === "idk" ? "other" : app,
          teams,
          myPosition: mySlot,
          scoring: "ppr",
        }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Too many drafts just now. Try again in a minute." : "Could not create your draft.");
      const { id } = await res.json();
      rememberDraft(id);
      router.push(`/draft/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your draft.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <ol className="mb-5 flex gap-1" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((i) => (
          <li key={i} className={`h-1 flex-1 ${i <= step ? "bg-ink" : "bg-rule"}`} />
        ))}
      </ol>

      {step === 1 && (
        <section>
          <h1>How well do you know fantasy?</h1>
          <div role="radiogroup" aria-label="Experience">
            {EXPERIENCE.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={exp === o.id} className="opt" onClick={() => setExp(o.id)}>
                <b>{o.label}</b>
                <small>{o.note}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1>Which app is your league on?</h1>
          <div role="radiogroup" aria-label="Fantasy app">
            {APPS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={app === o.id} className="opt" onClick={() => setApp(o.id)}>
                <b>{o.label}</b>
                {o.note && <small>{o.note}</small>}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1>Quick setup</h1>
          <p className="mt-2">We use standard rules (PPR scoring, snake draft). Two questions:</p>
          <p className="mt-5 font-semibold">How many teams?</p>
          <Stepper label="teams" value={teams} min={2} max={20} onChange={setTeams} />
          <p className="mt-5 font-semibold">What pick number are you?</p>
          <Stepper label="pick number" value={mySlot} min={1} max={teams} onChange={setSlot} />
          <p className="mt-2 text-sm text-muted">If you don&apos;t know yet, we&apos;ll guess the middle. You can change it later.</p>
          {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
        </section>
      )}

      <div className="mt-8 flex gap-3">
        {step === 1 ? (
          <Link href="/" className="btn btn-alt">Back</Link>
        ) : (
          <button type="button" className="btn btn-alt" onClick={() => setStep(step - 1)}>Back</button>
        )}
        {step < 3 ? (
          <button type="button" className="btn" disabled={step === 1 ? !exp : !app} onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start my draft"}</button>
        )}
      </div>
    </main>
  );
}
