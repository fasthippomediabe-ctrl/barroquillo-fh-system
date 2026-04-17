import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import PrintButton from "@/components/PrintButton";
import { fmt, fmtDate } from "@/lib/format";
import { getAccountingSummary, type PeriodFilter } from "@/lib/accounting";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  return (
    <div>
      <PageHeader
        title="Accounting"
        subtitle="Per-service profit sharing & company fund"
        actions={<PrintButton />}
      />

      <form className="card mb-4 no-print flex gap-3 items-end flex-wrap">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          View
          <select
            name="period"
            defaultValue={mode}
            className="select"
          >
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
        <Link href="/admin#profit-sharing" className="btn-secondary no-print">
          Manage shares
        </Link>
      </form>

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
          <div className="kpi-delta">before distribution</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Overhead</div>
          <div className="kpi-value">{fmt(data.totals.overheadExpenses)}</div>
          <div className="kpi-delta">unlinked expenses</div>
        </div>
      </div>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Partner Distributions</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Share</th>
                <th>%</th>
                <th>Gross (from service net)</th>
                <th>Overhead</th>
                <th>Net Payout</th>
                <th>Bank / Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.perShareTotals.map((p) => {
                const isFund = p.shareId === data.companyFund.shareId;
                const overhead = isFund ? data.totals.overheadExpenses : 0;
                const net = p.amount - overhead;
                const sh = data.shares.find((s) => s.id === p.shareId);
                return (
                  <tr key={p.shareId}>
                    <td className="font-semibold">
                      {p.name}
                      {isFund && (
                        <span className="ml-2 badge badge-warn">Company Fund</span>
                      )}
                    </td>
                    <td>{p.percent}%</td>
                    <td>{fmt(p.amount)}</td>
                    <td>{overhead > 0 ? `− ${fmt(overhead)}` : "—"}</td>
                    <td className="font-bold">
                      <span
                        className={net < 0 ? "text-[#c0392b]" : "text-[#27613a]"}
                      >
                        {fmt(net)}
                      </span>
                    </td>
                    <td className="text-xs text-[#4a5678]">
                      {sh?.bankInfo ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">
          Per-Service Profit &amp; Distribution
          <span className="text-sm font-normal text-[#4a5678] ml-2">
            ({data.serviceRows.length} service
            {data.serviceRows.length === 1 ? "" : "s"} with activity)
          </span>
        </h2>
        {data.serviceRows.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No services with revenue or expenses in this period.
          </p>
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
                        className="text-[var(--brand-navy)] font-semibold hover:underline"
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

      <section className="card">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="font-bold">Overhead — Unlinked Expenses</h2>
            <p className="text-xs text-[#4a5678]">
              Expenses with no service link, absorbed by the Company Fund.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#4a5678]">Total</div>
            <div className="text-xl font-bold text-[#c0392b]">
              {fmt(data.totals.overheadExpenses)}
            </div>
          </div>
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
                  <th></th>
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
                    <td>
                      <Link
                        href={`/expenses/${e.id}/edit`}
                        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
