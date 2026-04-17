import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import AddEntryForm from "./AddEntryForm";
import BulkAddButton from "./BulkAddButton";
import EntryRowActions from "./EntryRowActions";
import DeletePeriodButton from "./DeletePeriodButton";

export const dynamic = "force-dynamic";

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [period, allEmployees] = await Promise.all([
    prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        entries: {
          include: { employee: true },
          orderBy: [{ employee: { lastName: "asc" } }],
        },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: 1 },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);
  if (!period) notFound();

  const entriedEmployeeIds = new Set(period.entries.map((e) => e.employeeId));
  const availableEmployees = allEmployees.filter(
    (e) => !entriedEmployeeIds.has(e.id),
  );

  const totals = period.entries.reduce(
    (a, e) => ({
      gross: a.gross + e.grossPay,
      deductions: a.deductions + e.totalDeductions,
      net: a.net + e.netPay,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  return (
    <div>
      <BackLink href="/payroll" label="Back to payroll" />
      <PageHeader
        title={period.periodName}
        subtitle={`${fmtDate(period.startDate)} – ${fmtDate(period.endDate)} · Pay: ${fmtDate(period.payDate)}`}
        actions={
          <>
            <Link href={`/payroll/${id}/edit`} className="btn-secondary">
              Edit Period
            </Link>
            <DeletePeriodButton id={id} />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Employees</div>
          <div className="kpi-value">{period.entries.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Gross</div>
          <div className="kpi-value">{fmt(totals.gross)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Deductions</div>
          <div className="kpi-value">{fmt(totals.deductions)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net</div>
          <div className="kpi-value">{fmt(totals.net)}</div>
        </div>
      </div>

      <section className="card mb-6 no-print">
        <div className="flex justify-between items-start mb-3 gap-3 flex-wrap">
          <div>
            <h3 className="font-bold">Add Employee to This Period</h3>
            <p className="text-xs text-[#4a5678]">
              Auto-seeds basic pay + statutory from the employee&apos;s rate.
              Edit after adding to tweak OT, bonuses, deductions.
            </p>
          </div>
          {availableEmployees.length > 0 && (
            <BulkAddButton
              periodId={id}
              missingCount={availableEmployees.length}
            />
          )}
        </div>
        {availableEmployees.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            All active employees already have an entry for this period.
          </p>
        ) : (
          <AddEntryForm
            periodId={id}
            periodStart={period.startDate}
            periodEnd={period.endDate}
            employees={availableEmployees.map((e) => ({
              id: e.id,
              label: `${e.lastName}, ${e.firstName}${e.middleName ? " " + e.middleName[0] + "." : ""}`,
              position: e.position,
              rateType: e.rateType,
              rateAmount: e.rateAmount,
            }))}
          />
        )}
      </section>

      <section className="card p-0 overflow-hidden">
        <h3 className="font-bold p-4">Entries</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Basic</th>
                <th>Earnings +</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {period.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                period.entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="font-semibold">
                        {e.employee.lastName}, {e.employee.firstName}
                      </div>
                      <div className="text-xs text-[#4a5678]">
                        {e.employee.position ?? "—"}
                      </div>
                    </td>
                    <td>{fmt(e.basicPay)}</td>
                    <td>
                      {fmt(
                        e.overtimePay +
                          e.holidayPay +
                          e.bonus +
                          e.otherEarnings,
                      )}
                    </td>
                    <td>{fmt(e.totalDeductions)}</td>
                    <td className="font-bold text-[var(--brand-orange)]">
                      {fmt(e.netPay)}
                    </td>
                    <td>
                      {e.isPaid === 1 ? (
                        <span className="badge badge-active">paid</span>
                      ) : (
                        <span className="badge badge-warn">unpaid</span>
                      )}
                    </td>
                    <td>
                      <EntryRowActions
                        entryId={e.id}
                        periodId={id}
                        isPaid={e.isPaid === 1}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
