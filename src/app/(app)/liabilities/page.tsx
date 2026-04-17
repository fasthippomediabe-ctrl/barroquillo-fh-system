import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LiabilitiesPage() {
  const liabilities = await prisma.liability.findMany({
    include: { payments: { orderBy: { date: "desc" } } },
    orderBy: { dueDate: "asc" },
  });
  const totalRemaining = liabilities
    .filter((l) => l.status === "active")
    .reduce((a, l) => a + l.remainingBalance, 0);

  return (
    <div>
      <PageHeader
        title="Liabilities"
        subtitle={`${liabilities.filter((l) => l.status === "active").length} active · ${fmt(totalRemaining)} outstanding`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {liabilities.length === 0 ? (
          <div className="card md:col-span-2 text-sm text-[#4a5678]">
            No liabilities recorded.
          </div>
        ) : (
          liabilities.map((l) => (
            <div key={l.id} className="card">
              <div className="flex justify-between">
                <h3 className="font-bold text-[var(--brand-navy)]">{l.name}</h3>
                <span className={`badge badge-${l.status === "active" ? "warn" : "active"}`}>
                  {l.status}
                </span>
              </div>
              {l.creditor && (
                <div className="text-sm text-[#4a5678]">Creditor: {l.creditor}</div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <div className="text-xs text-[#4a5678]">Principal</div>
                  <div className="font-semibold">{fmt(l.principalAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4a5678]">Remaining</div>
                  <div className="font-semibold text-[#c0392b]">
                    {fmt(l.remainingBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#4a5678]">Monthly Payment</div>
                  <div>{fmt(l.monthlyPayment)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4a5678]">Due Date</div>
                  <div>{fmtDate(l.dueDate)}</div>
                </div>
              </div>
              {l.payments.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold">
                    Payments ({l.payments.length})
                  </summary>
                  <ul className="mt-2 text-xs">
                    {l.payments.map((p) => (
                      <li key={p.id} className="flex justify-between py-1 border-b border-[#e5ebf5]">
                        <span>{fmtDate(p.date)}</span>
                        <span className="font-semibold">{fmt(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
