import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import { getServiceBalances } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const tab = view === "outstanding" ? "outstanding" : "history";

  const tabs = [
    { key: "history", label: "Payment History" },
    { key: "outstanding", label: "Outstanding Balances" },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Record payments from individual service records"
      />

      <div className="flex gap-2 mb-4 border-b border-[#e5ebf5]">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/payments?view=${t.key}`}
              className={`px-4 py-2 text-sm font-semibold -mb-px ${
                active
                  ? "border-b-2 border-[var(--brand-orange)] text-[var(--brand-navy)]"
                  : "text-[#4a5678] hover:text-[var(--brand-navy)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "history" ? <HistoryTab /> : <OutstandingTab />}
    </div>
  );
}

async function HistoryTab() {
  const payments = await prisma.payment.findMany({
    include: { service: { include: { client: true } } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 200,
  });
  const total = payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <div className="kpi-card max-w-xs mb-4">
        <div className="kpi-label">Total (Latest 200)</div>
        <div className="kpi-value">{fmt(total)}</div>
      </div>
      <div className="card p-0 overflow-hidden">
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
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>
                      <Link
                        href={`/services/${p.serviceId}`}
                        className="text-[var(--brand-navy)] font-semibold hover:underline"
                      >
                        {p.service.client.deceasedFirstName}{" "}
                        {p.service.client.deceasedLastName}
                      </Link>
                    </td>
                    <td>{p.service.client.contactName}</td>
                    <td className="font-semibold">{fmt(p.amount)}</td>
                    <td className="capitalize">{p.method}</td>
                    <td>{p.reference ?? "—"}</td>
                    <td>{p.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

async function OutstandingTab() {
  const services = await prisma.service.findMany({
    where: { status: "active" },
    include: { client: true, package: true },
    orderBy: { burialDate: "asc" },
  });
  const balances = await getServiceBalances(services.map((s) => s.id));
  const rows = services
    .map((s) => ({ s, bal: balances.get(s.id) ?? 0 }))
    .filter((r) => r.bal > 0)
    .sort((a, b) => (a.s.burialDate ?? "9999").localeCompare(b.s.burialDate ?? "9999"));
  const total = rows.reduce((a, r) => a + r.bal, 0);

  return (
    <div>
      <div className="kpi-card max-w-xs mb-4">
        <div className="kpi-label">Total Outstanding</div>
        <div className="kpi-value">{fmt(total)}</div>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Deceased</th>
                <th>Contact</th>
                <th>Package</th>
                <th>Burial Date</th>
                <th>Net</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    All active services are fully paid. 🎉
                  </td>
                </tr>
              ) : (
                rows.map(({ s, bal }) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/services/${s.id}`}
                        className="text-[var(--brand-navy)] font-semibold hover:underline"
                      >
                        {s.client.deceasedFirstName} {s.client.deceasedLastName}
                      </Link>
                    </td>
                    <td>
                      {s.client.contactName}
                      {s.client.contactPhone && (
                        <div className="text-xs text-[#4a5678]">
                          {s.client.contactPhone}
                        </div>
                      )}
                    </td>
                    <td>{s.package?.name ?? s.customServiceName ?? "Custom"}</td>
                    <td>{fmtDate(s.burialDate)}</td>
                    <td>{fmt(s.totalAmount - s.discount)}</td>
                    <td className="text-[#c0392b] font-bold">{fmt(bal)}</td>
                    <td>
                      <Link
                        href={`/services/${s.id}`}
                        className="btn-primary text-xs"
                      >
                        Record Payment
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
