import Link from "next/link";
import { ResumeLink } from "./ResumeLink";

const SOON = ["NBA", "Premier League", "MLS"];

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1>Draft the best team, without the guesswork.</h1>
      <p className="mt-3 text-base">
        Works next to any fantasy app. Tell us your league and we show who to pick, and why.
      </p>
      <Link href="/setup" className="btn mt-5">
        Set up my NFL draft
      </Link>
      <Link href="/setup?mode=mock" className="btn btn-alt mt-3">
        Practice a mock draft
      </Link>
      <ResumeLink />
      <ul className="mt-6 grid grid-cols-3 gap-2" aria-label="Other sports">
        {SOON.map((s) => (
          <li key={s} className="flex min-h-14 items-center justify-center rounded-sm border border-rule px-2 text-center text-sm text-muted">
            {s}
            <span className="sr-only">, coming soon</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted">NFL for now. The rest are coming.</p>
    </main>
  );
}
