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
    newServices,
    completed,
    paymentList,
    expenseList,
    serviceProfits,
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
    prisma.service.count({
      where: { createdAt: { gte: start, lte: `${end}T23:59:59` } },
    }),
    prisma.service.count({
      where: { status: "completed", burialDate: { gte: start, lte: end } },
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
  ]);

  const revenue = payments._sum.amount ?? 0;
  const expenseTotal = expensesAgg._sum.amount ?? 0;
  const net = revenue - expenseTotal;

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
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value">{fmt(revenue)}</div>
          <div className="kpi-delta">{payments._count} payments</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Expenses</div>
          <div className="kpi-value">{fmt(expenseTotal)}</div>
          <div className="kpi-delta">{expensesAgg._count} entries</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net</div>
          <div className="kpi-value">{fmt(net)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Services</div>
          <div className="kpi-value">{newServices}</div>
          <div className="kpi-delta">{completed} completed</div>
        </div>
      </div>

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
