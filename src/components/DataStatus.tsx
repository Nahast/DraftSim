"use client";

import { useQuery } from "@tanstack/react-query";

export type SourceStatus = { source: string; lastOk: string | null; failed: boolean };

const STALE_AFTER_HOURS = 48;

function age(from: Date, now: Date): { hours: number; label: string } {
  const hours = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 3_600_000));
  if (hours < 1) return { hours, label: "less than an hour ago" };
  if (hours < 24) return { hours, label: `${hours} hour${hours === 1 ? "" : "s"} ago` };
  const days = Math.floor(hours / 24);
  return { hours, label: `${days} day${days === 1 ? "" : "s"} ago` };
}

/** Shows where the ADP comes from and how fresh it is; never lets stale or failed data pass silently. */
export function DataStatus({ sources, now = new Date() }: { sources: SourceStatus[]; now?: Date }) {
  const ffc = sources.find((s) => s.source === "ffc");
  const failed = sources.some((s) => s.failed);
  const updated = ffc?.lastOk ? age(new Date(ffc.lastOk), now) : null;
  const stale = updated !== null && updated.hours >= STALE_AFTER_HOURS;

  return (
    <div className="mx-4 mt-3 text-xs text-muted">
      <p>
        ADP from Fantasy Football Calculator · {updated ? `updated ${updated.label}` : "no data yet"}
      </p>
      {(failed || stale) && (
        <p role="alert" className="mt-1 border border-ink px-2 py-1 text-sm text-ink">
          {failed
            ? "The latest data update failed. You are seeing earlier data, so recommendations may be out of date."
            : `ADP data is ${updated!.label.replace(" ago", "")} old. Recommendations may be out of date.`}
        </p>
      )}
    </div>
  );
}

export function DataStatusLoader() {
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: async () => (await fetch("/api/status")).json() as Promise<{ sources: SourceStatus[] }>,
    staleTime: 5 * 60_000,
  });
  return data ? <DataStatus sources={data.sources} /> : null;
}
