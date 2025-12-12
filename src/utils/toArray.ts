export function toArray<T = string>(
  v: unknown,
  opts?: { csv?: boolean; split?: string; fallback?: T[] }
): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') {
    const s = (opts?.split ?? (opts?.csv ? ',' : undefined));
    if (s) return v.split(s).map(x => x.trim()).filter(Boolean) as unknown as T[];
    return v.trim() ? [v as unknown as T] : (opts?.fallback ?? []);
  }
  if (v == null) return opts?.fallback ?? [];
  return [v as unknown as T];
}
