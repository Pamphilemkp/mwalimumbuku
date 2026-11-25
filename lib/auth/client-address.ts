export function clientAddress(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim() ?? "";
  if (first.length === 0 || first.length > 64) return "unknown";
  if (!/^[0-9A-Fa-f:.]+$/.test(first)) return "unknown";
  return first;
}
