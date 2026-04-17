import { fmt, fmtDate } from "@/lib/format";

type Alert = { kind: "error" | "warn" | "info"; title: string; body?: string };

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.map((a, i) => {
        const cls =
          a.kind === "error"
            ? "bg-[#fbdcdc] border-[#c0392b] text-[#7a2323]"
            : a.kind === "warn"
              ? "bg-[#ffe7c9] border-[#e8872a] text-[#8a4b10]"
              : "bg-[#d6e2fb] border-[#1a4fcf] text-[#0a1e5e]";
        return (
          <div
            key={i}
            className={`rounded-lg border-l-4 px-4 py-3 text-sm ${cls}`}
          >
            <div className="font-bold">{a.title}</div>
            {a.body && <div className="mt-1">{a.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

export { fmt, fmtDate };
