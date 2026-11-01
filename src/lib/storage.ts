const KEY = "draftsim:lastDraft";

// Storage can be missing or throw (private windows, blocked site data); the draft URL still works without it.
export function rememberDraft(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

export function lastDraftId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
