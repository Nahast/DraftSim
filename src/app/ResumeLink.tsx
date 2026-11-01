"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { lastDraftId } from "@/lib/storage";

const noSubscription = () => () => {};

export function ResumeLink() {
  // Server and first client render see null, then the stored id: no hydration mismatch.
  const id = useSyncExternalStore(noSubscription, lastDraftId, () => null);
  if (!id) return null;
  return (
    <Link href={`/draft/${id}`} className="btn btn-alt mt-3">
      Resume your draft
    </Link>
  );
}
