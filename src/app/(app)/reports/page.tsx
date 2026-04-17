import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmt } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

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

  const [payments, expenses, newServices, completed] = await Promise.all([
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
  ]);

  const revenue = payments._sum.amount ?? 0;
  const expenseTotal = expenses._sum.amount ?? 0;
  const net = revenue - expenseTotal;

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
          <div className="kpi-delta">{expenses._count} entries</div>
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

      <div className="card text-sm text-[#4a5678]">
        Detailed breakdowns (category analysis, supplier analysis, cash flow) will be
        added next.
      </div>
    </div>
  );
}
