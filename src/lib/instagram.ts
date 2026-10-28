export function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "");
  return stripped.length ? stripped : null;
}

export function displayInstagram(handle: string | null | undefined): string {
  const norm = normalizeInstagram(handle);
  return norm ? `@${norm}` : "—";
}
