import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import PrintButton from "@/components/PrintButton";
import { getServiceProfits } from "@/lib/accounting";

export const dynamic = "force-dynamic";

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = sp.month ?? defaultMonth;
  const { start, end } = monthRange(month);

  const [
    payments,
    expensesAgg,
    paymentList,
    expenseList,
    serviceProfits,
    liabilityPayList,
    paidSalaryList,
    newBorrowingsList,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { date: { gte: start, lte: end } },
      select: { method: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true },
    }),
    getServiceProfits({ kind: "month", yyyymm: month }),
    prisma.liabilityPayment.findMany({
      where: { date: { gte: start, lte: end } },
      include: { liability: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    prisma.payrollEntry.findMany({
      where: {
        isPaid: 1,
        period: { payDate: { gte: start, lte: end } },
      },
      include: { employee: true, period: true },
      orderBy: [{ period: { payDate: "desc" } }, { id: "desc" }],
    }),
    prisma.liability.findMany({
      where: {
        createdAt: { gte: start, lte: `${end}T23:59:59` },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const revenue = payments._sum.amount ?? 0;
  const expenseTotal = expensesAgg._sum.amount ?? 0;
  const liabilityPayTotal = liabilityPayList.reduce((a, p) => a + p.amount, 0);
  const salariesPaidTotal = paidSalaryList.reduce((a, e) => a + e.netPay, 0);
  const totalOutflows = expenseTotal + liabilityPayTotal + salariesPaidTotal;
  const net = revenue - totalOutflows; // Operating net — can be negative
  const fundingReceived = newBorrowingsList.reduce(
    (a, l) => a + l.principalAmount,
    0,
  );
  const cashPosition = net + fundingReceived;

  // Liability payments grouped by creditor
  const liabByCreditor = new Map<
    string,
    { count: number; total: number }
  >();
  for (const p of liabilityPayList) {
    const key = p.liability.creditor || p.liability.name;
    const row = liabByCreditor.get(key) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total += p.amount;
    liabByCreditor.set(key, row);
  }
  const liabRows = Array.from(liabByCreditor.entries())
    .map(([creditor, v]) => ({ creditor, ...v }))
    .sort((a, b) => b.total - a.total);

  // Payment method breakdown
  const methodBreakdown = new Map<string, { count: number; total: number }>();
  for (const p of paymentList) {
    const row = methodBreakdown.get(p.method) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total += p.amount;
    methodBreakdown.set(p.method, row);
  }
  const methodRows = Array.from(methodBreakdown.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.total - a.total);

  // Expense category breakdown
  const catBreakdown = new Map<
    string,
    { count: number; total: number; color: string }
  >();
  for (const e of expenseList) {
    const key = e.category?.name ?? "Uncategorized";
    const color = e.category?.color ?? "#6c757d";
    const row = catBreakdown.get(key) ?? { count: 0, total: 0, color };
    row.count += 1;
    row.total += e.amount;
    row.color = color;
    catBreakdown.set(key, row);
  }
  const catRows = Array.from(catBreakdown.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  // Top profitable services this month
  const topServices = [...serviceProfits]
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  return (
    <div>
      <PageHeader
        title={`Monthly Report — ${month}`}
        actions={<PrintButton />}
      />

      <form className="card mb-4 no-print flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Month
          <input type="month" name="month" defaultValue={month} className="input" />
        </label>
        <button type="submit" className="btn-primary">
          Generate
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Gross Revenue</div>
          <div className="kpi-value">{fmt(revenue)}</div>
          <div className="kpi-delta">{payments._count} payments</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Outflows</div>
          <div className="kpi-value">{fmt(totalOutflows)}</div>
          <div className="kpi-delta">exp + liab + salary</div>
        </div>
        <div
          className="kpi-card"
          style={
            net < 0
              ? { background: "linear-gradient(135deg, #7a1f1f, #c0392b)" }
              : undefined
          }
        >
          <div className="kpi-label">Net Income</div>
          <div className="kpi-value">{fmt(net)}</div>
          <div className="kpi-delta">
            {net < 0 ? "deficit" : "operating profit"}
          </div>
        </div>
        <div
          className="kpi-card"
          style={
            cashPosition < 0
              ? { background: "linear-gradient(135deg, #7a1f1f, #c0392b)" }
              : undefined
          }
        >
          <div className="kpi-label">Cash Position</div>
          <div className="kpi-value">{fmt(cashPosition)}</div>
          <div className="kpi-delta">after {fmt(fundingReceived)} funding</div>
        </div>
      </div>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Profit &amp; Loss Statement</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2 font-semibold">
                <span className="text-[#27613a]">+</span> Gross Revenue
                (service payments received)
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#27613a]">
                {fmt(revenue)}
              </td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">
                <span className="text-[#c0392b]">−</span> Expenses (all linked
                + overhead)
              </td>
              <td className="py-2 pr-2 text-right text-[#c0392b]">
                {fmt(expenseTotal)}
              </td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">
                <span className="text-[#c0392b]">−</span> Liability Payments
              </td>
              <td className="py-2 pr-2 text-right text-[#c0392b]">
                {fmt(liabilityPayTotal)}
              </td>
            </tr>
            <tr className="border-b-2 border-[var(--brand-navy)]">
              <td className="py-2 pl-2">
                <span className="text-[#c0392b]">−</span> Salaries Paid (net)
              </td>
              <td className="py-2 pr-2 text-right text-[#c0392b]">
                {fmt(salariesPaidTotal)}
              </td>
            </tr>
            <tr className="font-bold text-lg bg-[var(--brand-bg-alt)]">
              <td className="py-3 pl-2">
                = Net Income {net < 0 ? "(Loss)" : ""}
              </td>
              <td
                className={`py-3 pr-2 text-right ${net < 0 ? "text-[#c0392b]" : "text-[#27613a]"}`}
              >
                {fmt(net)}
              </td>
            </tr>
            {fundingReceived > 0 && (
              <>
                <tr>
                  <td className="py-2 pl-2 text-[var(--brand-blue)]">
                    <span>+</span> Funding Received (new borrowings)
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold text-[var(--brand-blue)]">
                    {fmt(fundingReceived)}
                  </td>
                </tr>
                <tr className="font-bold text-lg bg-[var(--brand-bg-alt)] border-t-2 border-[var(--brand-navy)]">
                  <td className="py-3 pl-2">= Cash Position</td>
                  <td
                    className={`py-3 pr-2 text-right ${cashPosition < 0 ? "text-[#c0392b]" : "text-[#27613a]"}`}
                  >
                    {fmt(cashPosition)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {net < 0 && fundingReceived === 0 && (
          <div className="mt-3 text-xs bg-[#fbdcdc] text-[#7a2323] rounded px-3 py-2">
            <strong>Chapel ran a deficit this month with no funding recorded.</strong>{" "}
            If you covered the gap from Triple J Corp or Ascendryx Digital,
            record it as a new{" "}
            <Link href="/liabilities/new" className="underline font-semibold">
              liability
            </Link>{" "}
            so it shows up here.
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Funding Sources</h2>
        <p className="text-xs text-[#4a5678] mb-3">
          New borrowings recorded this month — e.g., Triple J Corp, Ascendryx
          Digital, or any other creditor — that brought cash into the chapel.
        </p>
        {newBorrowingsList.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No new borrowings recorded this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Creditor</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Amount Received</th>
                  <th>Still Owed</th>
                </tr>
              </thead>
              <tbody>
                {newBorrowingsList.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtDate(l.createdAt)}</td>
                    <td className="font-semibold">{l.creditor ?? "—"}</td>
                    <td className="capitalize">
                      {l.type.replace("_", " ")}
                    </td>
                    <td>{l.name}</td>
                    <td className="font-semibold text-[var(--brand-blue)]">
                      {fmt(l.principalAmount)}
                    </td>
                    <td>{fmt(l.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={4}>Total Received This Month</td>
                  <td className="text-[var(--brand-blue)]">
                    {fmt(fundingReceived)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <h2 className="font-bold mb-4">Expenses by Category</h2>
          {catRows.length === 0 ? (
            <p className="text-sm text-[#4a5678]">No expenses this month.</p>
          ) : (
            <div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map((r) => (
                    <tr key={r.name}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: (r.color ?? "#6c757d") + "22",
                            color: r.color ?? "#6c757d",
                          }}
                        >
                          {r.name}
                        </span>
                      </td>
                      <td>{r.count}</td>
                      <td className="font-semibold">{fmt(r.total)}</td>
                      <td>
                        {expenseTotal > 0
                          ? `${((r.total / expenseTotal) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold mb-4">Payments by Method</h2>
          {methodRows.length === 0 ? (
            <p className="text-sm text-[#4a5678]">No payments this month.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Count</th>
                  <th>Total</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {methodRows.map((r) => (
                  <tr key={r.method}>
                    <td className="capitalize">{r.method.replace("_", " ")}</td>
                    <td>{r.count}</td>
                    <td className="font-semibold">{fmt(r.total)}</td>
                    <td>
                      {revenue > 0
                        ? `${((r.total / revenue) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <h2 className="font-bold mb-4">Liability Payments by Creditor</h2>
          {liabRows.length === 0 ? (
            <p className="text-sm text-[#4a5678]">
              No liability payments this month.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Creditor</th>
                  <th>Count</th>
                  <th>Total</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {liabRows.map((r) => (
                  <tr key={r.creditor}>
                    <td>{r.creditor}</td>
                    <td>{r.count}</td>
                    <td className="font-semibold">{fmt(r.total)}</td>
                    <td>
                      {liabilityPayTotal > 0
                        ? `${((r.total / liabilityPayTotal) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={2}>Total</td>
                  <td colSpan={2}>{fmt(liabilityPayTotal)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold mb-4">Salaries Paid</h2>
          {paidSalaryList.length === 0 ? (
            <p className="text-sm text-[#4a5678]">
              No salaries paid this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pay Date</th>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {paidSalaryList.map((e) => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.period.payDate)}</td>
                      <td className="font-semibold">
                        {e.employee.lastName}, {e.employee.firstName}
                      </td>
                      <td className="text-xs">{e.period.periodName}</td>
                      <td className="font-semibold">{fmt(e.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-[var(--brand-bg-alt)]">
                    <td colSpan={3}>Total</td>
                    <td>{fmt(salariesPaidTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="font-bold mb-4">Top Profitable Services</h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No services with activity this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Deceased</th>
                  <th>Burial</th>
                  <th>Status</th>
                  <th>Revenue</th>
                  <th>Direct Exp.</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((s) => (
                  <tr key={s.serviceId}>
                    <td>
                      <Link
                        href={`/services/${s.serviceId}`}
                        className="font-semibold text-[var(--brand-navy)] hover:underline"
                      >
                        {s.clientName}
                      </Link>
                    </td>
                    <td>{fmtDate(s.burialDate)}</td>
                    <td>
                      <span className={`badge badge-${s.status}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-[#27613a] font-semibold">
                      {fmt(s.revenue)}
                    </td>
                    <td className="text-[#c0392b]">
                      {s.directExpenses > 0 ? fmt(s.directExpenses) : "—"}
                    </td>
                    <td
                      className={`font-bold ${
                        s.net < 0 ? "text-[#c0392b]" : ""
                      }`}
                    >
                      {fmt(s.net)}
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
