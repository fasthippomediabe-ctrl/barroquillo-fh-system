import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import { getServiceBalances } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && status !== "all" ? { status } : undefined;
  const services = await prisma.service.findMany({
    where,
    include: { client: true, package: true },
    orderBy: { createdAt: "desc" },
  });
  const balances = await getServiceBalances(services.map((s) => s.id));

  const statuses = ["active", "all", "completed", "cancelled"];

  return (
    <div>
      <PageHeader
        title="Service Records"
        subtitle={`${services.length} record${services.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/services/new" className="btn-primary">
            + New Service
          </Link>
        }
      />

      <div className="flex gap-2 mb-4">
        {statuses.map((sKey) => {
          const active = (status ?? "active") === sKey;
          return (
            <Link
              key={sKey}
              href={`/services?status=${sKey}`}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
                active
                  ? "bg-[var(--brand-navy)] text-white"
                  : "bg-white border border-[#d6dcec] text-[var(--brand-navy)] hover:bg-[var(--brand-bg-alt)]"
              }`}
            >
              {sKey}
            </Link>
          );
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Deceased</th>
                <th>Contact</th>
                <th>Package</th>
                <th>Wake</th>
                <th>Burial</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-[#4a5678] py-8">
                    No services found.
                  </td>
                </tr>
              ) : (
                services.map((s) => {
                  const bal = balances.get(s.id) ?? 0;
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link
                          href={`/services/${s.id}`}
                          className="font-semibold text-[var(--brand-navy)] hover:underline"
                        >
                          {s.client.deceasedFirstName} {s.client.deceasedLastName}
                        </Link>
                      </td>
                      <td>{s.client.contactName}</td>
                      <td>{s.package?.name ?? s.customServiceName ?? "Custom"}</td>
                      <td>{fmtDate(s.wakeStartDate)}</td>
                      <td>{fmtDate(s.burialDate)}</td>
                      <td>{fmt(s.totalAmount)}</td>
                      <td className={bal > 0 ? "text-[#c0392b] font-semibold" : "text-[#27613a]"}>
                        {fmt(bal)}
                      </td>
                      <td>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
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
