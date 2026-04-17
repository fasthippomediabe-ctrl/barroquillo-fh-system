export function fmt(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
