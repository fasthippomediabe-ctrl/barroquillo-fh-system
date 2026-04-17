import { prisma } from "@/lib/prisma";
import { getServiceBalances } from "@/lib/queries";
import { fmt, fmtDate } from "@/lib/format";
import { Kpi } from "@/components/Kpi";
import { AlertList } from "@/components/Alerts";
import Link from "next/link";
import MonthlyChart from "./MonthlyChart";

export const dynamic = "force-dynamic";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const today = iso(new Date());
  const tomorrow = iso(new Date(Date.now() + 86400000));
  const in3days = iso(new Date(Date.now() + 3 * 86400000));
  const monthStart = iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [
    activeCount,
    totalClients,
    monthRevenue,
    monthExpenses,
    activeServices,
    burialsToday,
    burialsTomorrow,
    burialsUpcoming,
    wakesToday,
    recentPayments,
    trendPayments,
    trendExpenses,
  ] = await Promise.all([
    prisma.service.count({ where: { status: "active" } }),
    prisma.client.count(),
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: today } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: today } },
      _sum: { amount: true },
    }),
    prisma.service.findMany({
      where: { status: "active" },
      include: { client: true, package: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { status: "active", burialDate: today },
      include: { client: true, package: true },
    }),
    prisma.service.findMany({
      where: { status: "active", burialDate: tomorrow },
      include: { client: true },
    }),
    prisma.service.findMany({
      where: {
        status: "active",
        burialDate: { gt: tomorrow, lte: in3days },
      },
      include: { client: true },
    }),
    prisma.service.findMany({
      where: {
        status: "active",
        wakeStartDate: { lte: today },
        wakeEndDate: { gte: today },
      },
      include: { client: true },
    }),
    prisma.payment.findMany({
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 10,
      include: { service: { include: { client: true } } },
    }),
    prisma.payment.findMany({ select: { date: true, amount: true } }),
    prisma.expense.findMany({ select: { date: true, amount: true } }),
  ]);

  const balances = await getServiceBalances(activeServices.map((s) => s.id));
  const outstanding = Array.from(balances.values()).reduce(
    (a, b) => a + Math.max(0, b),
    0,
  );

  const alerts: { kind: "error" | "warn" | "info"; title: string; body?: string }[] = [];

  for (const b of burialsToday) {
    alerts.push({
      kind: "error",
      title: `🚨 BURIAL TODAY — ${b.client.deceasedFirstName} ${b.client.deceasedLastName}`,
      body: `Location: ${b.burialLocation || "TBD"} | Contact: ${b.client.contactName} ${b.client.contactPhone ?? ""} | Package: ${b.package?.name ?? "Custom"}`,
    });
  }
  for (const b of burialsTomorrow) {
    alerts.push({
      kind: "warn",
      title: `⚠️ Burial TOMORROW — ${b.client.deceasedFirstName} ${b.client.deceasedLastName}`,
      body: `Location: ${b.burialLocation || "TBD"} | Contact: ${b.client.contactName} ${b.client.contactPhone ?? ""}`,
    });
  }
  for (const w of wakesToday) {
    alerts.push({
      kind: "info",
      title: `🕯️ Wake ongoing today — ${w.client.deceasedFirstName} ${w.client.deceasedLastName}`,
      body: `Wake: ${w.wakeStartDate ?? ""} to ${w.wakeEndDate ?? ""} | Contact: ${w.client.contactName}`,
    });
  }
  for (const b of burialsUpcoming) {
    alerts.push({
      kind: "info",
      title: `📅 Upcoming burial — ${b.client.deceasedFirstName} ${b.client.deceasedLastName}`,
      body: `On ${b.burialDate} at ${b.burialLocation || "TBD"}`,
    });
  }

  // Policy alert: unpaid with burial in the next 3 days
  const unpaidUrgent = activeServices.filter(
    (s) => s.burialDate && s.burialDate >= today && s.burialDate <= in3days,
  );
  for (const u of unpaidUrgent) {
    const bal = balances.get(u.id) ?? 0;
    if (bal <= 0) continue;
    const name = `${u.client.deceasedFirstName} ${u.client.deceasedLastName}`;
    if (u.burialDate === today) {
      alerts.push({
        kind: "error",
        title: `🚨 POLICY ALERT: UNPAID — BURIAL TODAY!`,
        body: `${name} still owes ${fmt(bal)}. Policy: Full payment must be settled on or before interment. Contact: ${u.client.contactName}`,
      });
    } else if (u.burialDate === tomorrow) {
      alerts.push({
        kind: "error",
        title: `⚠️ PAYMENT DUE TOMORROW`,
        body: `${name} still owes ${fmt(bal)}. Burial is tomorrow — payment must be settled before interment. Contact: ${u.client.contactName}`,
      });
    } else {
      alerts.push({
        kind: "warn",
        title: `💳 Unpaid balance`,
        body: `${name} has ${fmt(bal)} remaining, burial on ${u.burialDate}. Contact: ${u.client.contactName}`,
      });
    }
  }

  // Monthly trend
  const trendMap = new Map<string, { revenue: number; expenses: number }>();
  for (const p of trendPayments) {
    const m = (p.date ?? "").slice(0, 7);
    if (!m) continue;
    const row = trendMap.get(m) ?? { revenue: 0, expenses: 0 };
    row.revenue += p.amount ?? 0;
    trendMap.set(m, row);
  }
  for (const e of trendExpenses) {
    const m = (e.date ?? "").slice(0, 7);
    if (!m) continue;
    const row = trendMap.get(m) ?? { revenue: 0, expenses: 0 };
    row.expenses += e.amount ?? 0;
    trendMap.set(m, row);
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, Revenue: v.revenue, Expenses: v.expenses }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <AlertList alerts={alerts} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Kpi label="Active Services" value={activeCount} />
        <Kpi label="Total Clients" value={totalClients} />
        <Kpi label="Revenue (This Month)" value={fmt(monthRevenue._sum.amount ?? 0)} />
        <Kpi label="Expenses (This Month)" value={fmt(monthExpenses._sum.amount ?? 0)} />
        <Kpi label="Outstanding Balance" value={fmt(outstanding)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Active Services</h2>
          {activeServices.length === 0 ? (
            <p className="text-sm text-[#4a5678]">No active services.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#e5ebf5]">
              {activeServices.map((s) => {
                const bal = balances.get(s.id) ?? 0;
                return (
                  <li key={s.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/services/${s.id}`}
                          className="font-semibold text-[var(--brand-navy)] hover:underline"
                        >
                          {s.client.deceasedFirstName} {s.client.deceasedLastName}
                        </Link>
                        <div className="text-xs text-[#4a5678]">
                          {s.package?.name ?? s.customServiceName ?? "Custom"} ·{" "}
                          Contact: {s.client.contactName}
                        </div>
                        <div className="text-xs text-[#4a5678] mt-0.5">
                          Wake: {fmtDate(s.wakeStartDate)} · Burial: {fmtDate(s.burialDate)}
                        </div>
                      </div>
                      <span
                        className={`badge ${bal > 0 ? "badge-warn" : "badge-active"}`}
                      >
                        {bal > 0 ? `Bal ${fmt(bal)}` : "Fully Paid"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">Revenue vs Expenses (Monthly)</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-[#4a5678]">No financial data yet.</p>
          ) : (
            <MonthlyChart data={trend} />
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Recent Payments Received</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Deceased</th>
                  <th>Contact</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>
                      {p.service.client.deceasedFirstName}{" "}
                      {p.service.client.deceasedLastName}
                    </td>
                    <td>{p.service.client.contactName}</td>
                    <td className="font-semibold">{fmt(p.amount)}</td>
                    <td className="capitalize">{p.method}</td>
                    <td>{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
