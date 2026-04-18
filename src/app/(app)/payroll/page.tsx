import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import GenerateCutoffsButton from "./GenerateCutoffsButton";

export const dynamic = "force-dynamic";

export default async function PayrollIndex() {
  const periods = await prisma.payrollPeriod.findMany({
    include: {
      entries: {
        select: { netPay: true, grossPay: true, isPaid: true },
      },
    },
    orderBy: [{ startDate: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Pay periods, entries, and payslips"
        actions={
          <>
            <Link href="/payroll/calculator" className="btn-secondary">
              Statutory Calculator
            </Link>
            <GenerateCutoffsButton />
            <Link href="/payroll/new" className="btn-primary">
              + New Period
            </Link>
          </>
        }
      />

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Dates</th>
                <th>Pay Date</th>
                <th>Entries</th>
                <th>Gross</th>
                <th>Net</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-[#4a5678] py-8">
                    No pay periods yet. Click <strong>+ New Period</strong> to start.
                  </td>
                </tr>
              ) : (
                periods.map((p) => {
                  const gross = p.entries.reduce((a, e) => a + e.grossPay, 0);
                  const net = p.entries.reduce((a, e) => a + e.netPay, 0);
                  const paidCount = p.entries.filter((e) => e.isPaid === 1).length;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/payroll/${p.id}`}
                          className="font-semibold text-[var(--brand-navy)] hover:underline"
                        >
                          {p.periodName}
                        </Link>
                      </td>
                      <td>
                        {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                      </td>
                      <td>{fmtDate(p.payDate)}</td>
                      <td>{p.entries.length}</td>
                      <td>{fmt(gross)}</td>
                      <td className="font-semibold">{fmt(net)}</td>
                      <td>
                        {paidCount}/{p.entries.length}
                      </td>
                      <td>
                        <span
                          className={`badge badge-${
                            p.status === "paid"
                              ? "active"
                              : p.status === "cancelled"
                                ? "cancelled"
                                : "warn"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
