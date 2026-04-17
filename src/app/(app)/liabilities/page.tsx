import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LiabilitiesPage() {
  const liabilities = await prisma.liability.findMany({
    include: { _count: { select: { payments: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const totalRemaining = liabilities
    .filter((l) => l.status === "active")
    .reduce((a, l) => a + l.remainingBalance, 0);

  return (
    <div>
      <PageHeader
        title="Liabilities"
        subtitle={`${liabilities.filter((l) => l.status === "active").length} active · ${fmt(totalRemaining)} outstanding`}
        actions={
          <Link href="/liabilities/new" className="btn-primary">
            + New Liability
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {liabilities.length === 0 ? (
          <div className="card md:col-span-2 text-sm text-[#4a5678]">
            No liabilities recorded.
          </div>
        ) : (
          liabilities.map((l) => (
            <Link
              key={l.id}
              href={`/liabilities/${l.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-[var(--brand-navy)]">{l.name}</h3>
                <span
                  className={`badge badge-${l.status === "active" ? "warn" : l.status === "paid" ? "active" : "cancelled"}`}
                >
                  {l.status}
                </span>
              </div>
              {l.creditor && (
                <div className="text-sm text-[#4a5678]">
                  Creditor: {l.creditor}
                </div>
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
                  <div className="text-xs text-[#4a5678]">Monthly</div>
                  <div>{fmt(l.monthlyPayment)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4a5678]">Due Date</div>
                  <div>{fmtDate(l.dueDate)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#e5ebf5] text-xs text-[#4a5678]">
                {l._count.payments} payment
                {l._count.payments === 1 ? "" : "s"} recorded
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
