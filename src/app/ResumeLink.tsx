"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lastDraftId } from "@/lib/storage";

export function ResumeLink() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(lastDraftId()), []);
  if (!id) return null;
  return (
    <Link href={`/draft/${id}`} className="btn btn-alt mt-3">
      Resume your draft
    </Link>
  );
}
