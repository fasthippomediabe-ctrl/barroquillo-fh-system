import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import PrintButton from "@/components/PrintButton";
import { fmt, fmtDate } from "@/lib/format";
import { getAccountingSummary, type PeriodFilter } from "@/lib/accounting";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
  });
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; month?: string }>;
}) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role;
  if (!["admin", "accounting"].includes(role)) redirect("/");

  const sp = await searchParams;
  const mode = sp.period === "all" ? "all" : "month";
  const month = sp.month ?? currentMonth();
  const filter: PeriodFilter =
    mode === "all" ? { kind: "all" } : { kind: "month", yyyymm: month };

  const data = await getAccountingSummary(filter);
  const periodLabel = mode === "all" ? "All Time" : monthLabel(month);
  const fundNegative = data.companyFund.net < 0;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Accounting"
          subtitle="Per-service profit sharing & company fund"
          actions={<PrintButton label="Print / Save as PDF" />}
        />
        <form className="card mb-4 flex gap-3 items-end flex-wrap">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            View
            <select name="period" defaultValue={mode} className="select">
              <option value="month">By Month</option>
              <option value="all">All Time</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Month
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="input"
            />
          </label>
          <button type="submit" className="btn-primary">
            Update
          </button>
          <div className="flex-1" />
          <Link href="/admin" className="btn-secondary">
            Manage shares
          </Link>
        </form>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-4 border-b-2 border-[var(--brand-navy)] pb-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={60}
            height={60}
            className="rounded-full"
          />
          <div className="flex-1">
            <div className="text-xl font-bold">
              L.E. BARROQUILLO FUNERAL HOMES
            </div>
            <div className="text-sm">Accounting Report — {periodLabel}</div>
          </div>
          <div className="text-xs text-right">
            Generated {new Date().toLocaleDateString("en-PH")}
          </div>
        </div>
      </div>

      <h2 className="font-bold mb-3 print:mt-0 text-lg">
        1. Headline Figures — {periodLabel}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Revenue (paid)</div>
          <div className="kpi-value">{fmt(data.totals.serviceRevenue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Direct Expenses</div>
          <div className="kpi-value">
            {fmt(data.totals.serviceDirectExpenses)}
          </div>
          <div className="kpi-delta">linked to services</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Service Net</div>
          <div className="kpi-value">{fmt(data.totals.serviceNet)}</div>
          <div className="kpi-delta">shared immediately</div>
        </div>
        <div
          className="kpi-card"
          style={
            fundNegative
              ? { background: "linear-gradient(135deg, #7a1f1f, #c0392b)" }
              : undefined
          }
        >
          <div className="kpi-label">Company Fund Net</div>
          <div className="kpi-value">{fmt(data.companyFund.net)}</div>
          <div className="kpi-delta">
            {fundNegative ? "deficit — needs infusion" : "available balance"}
          </div>
        </div>
      </div>

      <h2 className="font-bold mb-3 text-lg">2. Partner Distributions</h2>
      <section className="card mb-6">
        <p className="text-xs text-[#4a5678] mb-3">
          Service net is split immediately by the active share percentages.
          The largest share — the Company Fund — additionally absorbs all
          overhead, liability payments, and paid salaries for the period.
        </p>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Share</th>
                <th>%</th>
                <th>Gross (from service net)</th>
                <th>− Overhead</th>
                <th>− Liability Pay.</th>
                <th>− Salaries</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.perShareTotals.map((p) => {
                const isFund = p.shareId === data.companyFund.shareId;
                const overhead = isFund ? data.totals.overheadExpenses : 0;
                const liab = isFund ? data.totals.liabilityPayments : 0;
                const salary = isFund ? data.totals.salariesPaid : 0;
                const net = p.amount - overhead - liab - salary;
                const sh = data.shares.find((s) => s.id === p.shareId);
                return (
                  <tr key={p.shareId}>
                    <td className="font-semibold">
                      {p.name}
                      {isFund && (
                        <span className="ml-2 badge badge-warn">
                          Company Fund
                        </span>
                      )}
                      {sh?.bankInfo && (
                        <div className="text-xs text-[#4a5678] font-normal">
                          {sh.bankInfo}
                        </div>
                      )}
                    </td>
                    <td>{p.percent}%</td>
                    <td>{fmt(p.amount)}</td>
                    <td>{overhead > 0 ? fmt(overhead) : "—"}</td>
                    <td>{liab > 0 ? fmt(liab) : "—"}</td>
                    <td>{salary > 0 ? fmt(salary) : "—"}</td>
                    <td className="font-bold">
                      <span
                        className={
                          net < 0 ? "text-[#c0392b]" : "text-[#27613a]"
                        }
                      >
                        {fmt(net)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <h2 className="font-bold mb-3 text-lg">
        3. Per-Service Profit &amp; Distribution
      </h2>
      <section className="card mb-6">
        <p className="text-xs text-[#4a5678] mb-3">
          {data.serviceRows.length} service
          {data.serviceRows.length === 1 ? "" : "s"} with activity in this
          period.
        </p>
        {data.serviceRows.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No service activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Deceased</th>
                  <th>Burial</th>
                  <th>Revenue</th>
                  <th>Direct Exp.</th>
                  <th>Net</th>
                  {data.shares.map((s) => (
                    <th key={s.id}>
                      {s.name.split(" ")[0]} ({s.percent}%)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.serviceRows.map((r) => (
                  <tr key={r.serviceId}>
                    <td>
                      <Link
                        href={`/services/${r.serviceId}`}
                        className="text-[var(--brand-navy)] font-semibold hover:underline print:no-underline"
                      >
                        {r.clientName}
                      </Link>
                      <div className="text-xs text-[#4a5678]">
                        {r.packageName ?? "Custom"}
                      </div>
                    </td>
                    <td>{fmtDate(r.burialDate)}</td>
                    <td className="text-[#27613a] font-semibold">
                      {fmt(r.revenue)}
                    </td>
                    <td className="text-[#c0392b]">
                      {r.directExpenses > 0 ? fmt(r.directExpenses) : "—"}
                    </td>
                    <td
                      className={`font-bold ${
                        r.net < 0 ? "text-[#c0392b]" : ""
                      }`}
                    >
                      {fmt(r.net)}
                    </td>
                    {r.distributions.map((d) => (
                      <td key={d.shareId}>{fmt(d.amount)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={2}>Totals</td>
                  <td>{fmt(data.totals.serviceRevenue)}</td>
                  <td>{fmt(data.totals.serviceDirectExpenses)}</td>
                  <td>{fmt(data.totals.serviceNet)}</td>
                  {data.perShareTotals.map((p) => (
                    <td key={p.shareId}>{fmt(p.amount)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <h2 className="font-bold mb-3 text-lg break-before-page">
        4. Company Fund — Cash Flow
      </h2>
      <section className="card mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">
                <strong className="text-[#27613a]">Inflow:</strong> 50% share
                from service net
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#27613a]">
                + {fmt(data.companyFund.grossFromServices)}
              </td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">
                <strong className="text-[#c0392b]">Outflow:</strong> Overhead
                (unlinked expenses)
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#c0392b]">
                − {fmt(data.totals.overheadExpenses)}
              </td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">
                <strong className="text-[#c0392b]">Outflow:</strong> Liability
                payments
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#c0392b]">
                − {fmt(data.totals.liabilityPayments)}
              </td>
            </tr>
            <tr className="border-b-2 border-[var(--brand-navy)]">
              <td className="py-2 pl-2">
                <strong className="text-[#c0392b]">Outflow:</strong> Salaries
                paid (net)
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#c0392b]">
                − {fmt(data.totals.salariesPaid)}
              </td>
            </tr>
            <tr className="font-bold text-lg">
              <td className="py-3 pl-2">
                {fundNegative ? "Deficit" : "Balance"}
              </td>
              <td
                className={`py-3 pr-2 text-right ${
                  fundNegative ? "text-[#c0392b]" : "text-[#27613a]"
                }`}
              >
                {fmt(data.companyFund.net)}
              </td>
            </tr>
          </tbody>
        </table>
        {fundNegative && (
          <div className="mt-3 text-xs bg-[#fbdcdc] text-[#7a2323] rounded px-3 py-2">
            <strong>Company Fund ended this period in deficit.</strong>{" "}
            Recorded as-is — partners received their shares per service in
            real time, and outflows exceeded the fund&apos;s inflow. Cover
            the gap with a loan from a related entity (e.g. Triple J Corp
            or Ascendryx Digital) by adding a liability in{" "}
            <Link
              href="/liabilities/new"
              className="underline font-semibold"
            >
              Liabilities
            </Link>{" "}
            — then record future repayments which will show up as outflows in
            the next report.
          </div>
        )}
      </section>

      <h2 className="font-bold mb-3 text-lg">5. Overhead (Unlinked Expenses)</h2>
      <section className="card mb-6">
        <div className="flex justify-between mb-3">
          <p className="text-xs text-[#4a5678]">
            {data.overheadList.length} item
            {data.overheadList.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-bold text-[#c0392b]">
            Total: {fmt(data.totals.overheadExpenses)}
          </p>
        </div>
        {data.overheadList.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No overhead in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.overheadList.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td>{e.categoryName ?? "—"}</td>
                    <td>{e.description ?? "—"}</td>
                    <td>{e.reference ?? "—"}</td>
                    <td className="font-semibold">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="font-bold mb-3 text-lg">6. Liability Payments</h2>
      <section className="card mb-6">
        <div className="flex justify-between mb-3">
          <p className="text-xs text-[#4a5678]">
            {data.liabilityPaymentsList.length} payment
            {data.liabilityPaymentsList.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-bold text-[#c0392b]">
            Total: {fmt(data.totals.liabilityPayments)}
          </p>
        </div>
        {data.liabilityPaymentsList.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No liability payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Liability</th>
                  <th>Creditor</th>
                  <th>Notes</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.liabilityPaymentsList.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.liabilityName}</td>
                    <td>{p.creditor ?? "—"}</td>
                    <td>{p.notes ?? "—"}</td>
                    <td className="font-semibold">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="font-bold mb-3 text-lg">7. Salaries Paid</h2>
      <section className="card mb-6">
        <div className="flex justify-between mb-3">
          <p className="text-xs text-[#4a5678]">
            {data.salariesList.length} payout
            {data.salariesList.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-bold text-[#c0392b]">
            Total: {fmt(data.totals.salariesPaid)}
          </p>
        </div>
        {data.salariesList.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No salaries paid in this period (only payroll entries marked{" "}
            <em>paid</em> count, filtered by the pay period&apos;s pay date).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pay Date</th>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Period</th>
                  <th>Paid Via</th>
                  <th>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {data.salariesList.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.payDate)}</td>
                    <td>{s.employeeName}</td>
                    <td>{s.position ?? "—"}</td>
                    <td>{s.periodName}</td>
                    <td>{s.paidVia ?? "—"}</td>
                    <td className="font-semibold">{fmt(s.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="font-bold mb-3 text-lg">
        8. Debt Position — Active Liabilities
      </h2>
      <section className="card mb-6">
        <p className="text-xs text-[#4a5678] mb-3">
          All active liabilities (regardless of period filter) so the total
          outstanding debt position is always visible. When the Company Fund
          deficits, record the cover from a related entity — e.g., Triple J
          Corp or Ascendryx Digital — as a new liability.
        </p>
        {data.activeLiabilities.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No active liabilities.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Creditor</th>
                  <th>Type</th>
                  <th>Principal</th>
                  <th>Remaining</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.activeLiabilities.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.name}</td>
                    <td>{l.creditor ?? "—"}</td>
                    <td className="capitalize">{l.type.replace("_", " ")}</td>
                    <td>{fmt(l.principalAmount)}</td>
                    <td className="font-semibold text-[#c0392b]">
                      {fmt(l.remainingBalance)}
                    </td>
                    <td>{fmtDate(l.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={4}>Total Outstanding</td>
                  <td colSpan={2} className="text-[#c0392b]">
                    {fmt(
                      data.activeLiabilities.reduce(
                        (a, l) => a + l.remainingBalance,
                        0,
                      ),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="hidden print:block mt-8 pt-4 border-t border-[#e5ebf5] text-xs text-[#4a5678]">
        <p>
          Report generated on{" "}
          {new Date().toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          · L.E. Barroquillo Funeral Homes Management System
        </p>
      </div>
    </div>
  );
}
