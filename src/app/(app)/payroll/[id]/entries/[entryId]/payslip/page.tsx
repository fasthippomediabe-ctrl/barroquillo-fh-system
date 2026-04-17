import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id: idStr, entryId: entryIdStr } = await params;
  const id = Number(idStr);
  const entryId = Number(entryIdStr);
  if (!Number.isFinite(id) || !Number.isFinite(entryId)) notFound();

  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: { employee: true, period: true },
  });
  if (!entry) notFound();

  const e = entry;

  return (
    <div>
      <div className="no-print">
        <BackLink href={`/payroll/${id}`} label="Back to period" />
        <PageHeader
          title="Payslip"
          actions={<PrintButton label="Print Payslip" />}
        />
      </div>

      <div className="bg-white mx-auto max-w-3xl p-8 shadow rounded-lg print:shadow-none print:p-4">
        <header className="flex items-start gap-4 border-b-2 border-[var(--brand-navy)] pb-4 mb-6">
          <Image
            src="/logo.png"
            alt="Logo"
            width={60}
            height={60}
            className="rounded-full bg-white"
          />
          <div className="flex-1">
            <div className="text-xl font-bold text-[var(--brand-navy)]">
              L.E. BARROQUILLO FUNERAL HOMES
            </div>
            <div className="text-xs text-[#4a5678]">Payslip</div>
          </div>
          <div className="text-right text-xs text-[#4a5678]">
            <div>
              <strong className="text-[var(--brand-navy)]">Period:</strong>{" "}
              {e.period.periodName}
            </div>
            <div>
              {fmtDate(e.period.startDate)} – {fmtDate(e.period.endDate)}
            </div>
            {e.period.payDate && (
              <div>
                <strong>Pay Date:</strong> {fmtDate(e.period.payDate)}
              </div>
            )}
          </div>
        </header>

        <section className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase text-[#4a5678] font-semibold">
                Employee
              </div>
              <div className="text-base font-bold">
                {e.employee.lastName}, {e.employee.firstName}{" "}
                {e.employee.middleName ?? ""}
              </div>
              <div className="text-xs text-[#4a5678]">
                {e.employee.position ?? ""}
                {e.employee.department ? ` · ${e.employee.department}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-[#4a5678] font-semibold">
                Rate
              </div>
              <div className="font-bold">
                {fmt(e.employee.rateAmount)} / {e.employee.rateType}
              </div>
              {e.employee.sssNumber && (
                <div className="text-xs text-[#4a5678]">
                  SSS: {e.employee.sssNumber}
                </div>
              )}
              {e.employee.tinNumber && (
                <div className="text-xs text-[#4a5678]">
                  TIN: {e.employee.tinNumber}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-bold text-[var(--brand-navy)] bg-[var(--brand-bg-alt)] px-3 py-2 rounded-t">
              Earnings
            </h3>
            <table className="w-full text-sm border-x border-b border-[#e5ebf5]">
              <tbody>
                <Row label="Basic Pay" value={e.basicPay} />
                <Row label="Overtime" value={e.overtimePay} zero="—" />
                <Row label="Holiday" value={e.holidayPay} zero="—" />
                <Row label="Bonus" value={e.bonus} zero="—" />
                <Row
                  label={
                    e.otherEarnings > 0 && e.otherEarningsNote
                      ? `Other (${e.otherEarningsNote})`
                      : "Other"
                  }
                  value={e.otherEarnings}
                  zero="—"
                />
                <tr className="font-bold border-t-2 border-[var(--brand-navy)] bg-[var(--brand-bg-alt)]">
                  <td className="px-3 py-2">Gross Pay</td>
                  <td className="px-3 py-2 text-right">{fmt(e.grossPay)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold text-[var(--brand-navy)] bg-[var(--brand-bg-alt)] px-3 py-2 rounded-t">
              Deductions
            </h3>
            <table className="w-full text-sm border-x border-b border-[#e5ebf5]">
              <tbody>
                <Row label="SSS" value={e.sss} zero="—" />
                <Row label="PhilHealth" value={e.philhealth} zero="—" />
                <Row label="Pag-IBIG" value={e.pagibig} zero="—" />
                <Row label="Withholding Tax" value={e.tax} zero="—" />
                <Row label="Cash Advance" value={e.cashAdvance} zero="—" />
                <Row label="Absences" value={e.absences} zero="—" />
                <Row label="Late/Tardy" value={e.lateDeductions} zero="—" />
                <Row
                  label={
                    e.otherDeductions > 0 && e.otherDeductionsNote
                      ? `Other (${e.otherDeductionsNote})`
                      : "Other"
                  }
                  value={e.otherDeductions}
                  zero="—"
                />
                <tr className="font-bold border-t-2 border-[var(--brand-navy)] bg-[var(--brand-bg-alt)]">
                  <td className="px-3 py-2">Total Deductions</td>
                  <td className="px-3 py-2 text-right">
                    {fmt(e.totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-[var(--brand-navy)] text-white rounded-lg p-4 flex justify-between items-center mb-6">
          <div className="uppercase font-semibold text-sm">Net Pay</div>
          <div className="text-2xl font-bold text-[var(--brand-orange)]">
            {fmt(e.netPay)}
          </div>
        </section>

        {e.notes && (
          <section className="text-sm mb-6">
            <div className="text-xs uppercase text-[#4a5678] font-semibold">
              Notes
            </div>
            <p className="whitespace-pre-wrap">{e.notes}</p>
          </section>
        )}

        <section className="grid grid-cols-2 gap-8 mt-12 text-sm">
          <div className="border-t border-[#4a5678] pt-1">
            <div className="text-xs text-[#4a5678]">Prepared by</div>
          </div>
          <div className="border-t border-[#4a5678] pt-1 text-center">
            <div className="text-xs text-[#4a5678]">
              Received by — Employee Signature
            </div>
          </div>
        </section>

        {e.isPaid === 1 && (
          <div className="mt-4 text-center text-sm text-[#27613a] font-semibold">
            ✓ Paid{e.paidVia ? ` via ${e.paidVia}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  zero,
}: {
  label: string;
  value: number;
  zero?: string;
}) {
  return (
    <tr className="border-t border-[#e5ebf5]">
      <td className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-right">
        {value === 0 && zero ? zero : fmt(value)}
      </td>
    </tr>
  );
}
