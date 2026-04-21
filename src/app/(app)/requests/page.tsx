import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  pending: "warn",
  approved: "active",
  released: "active",
  rejected: "cancelled",
  cancelled: "cancelled",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; scope?: string }>;
}) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  const me = u
    ? { id: Number(u.id), role: (u.role ?? "staff") as string }
    : null;
  if (!me) return null;

  const canReview = me.role === "admin" || me.role === "accounting";

  const sp = await searchParams;
  const status = sp.status ?? "all";
  const scope = canReview ? (sp.scope ?? "all") : "mine";

  const where: {
    status?: string;
    requestedByUserId?: number;
  } = {};
  if (status !== "all") where.status = status;
  if (scope === "mine") where.requestedByUserId = me.id;

  const requests = await prisma.branchRequest.findMany({
    where,
    include: {
      requestedBy: true,
      reviewer: true,
      liability: true,
      category: true,
    },
    orderBy: [{ id: "desc" }],
    take: 200,
  });

  const pendingCount = await prisma.branchRequest.count({
    where: {
      status: "pending",
      ...(scope === "mine" ? { requestedByUserId: me.id } : {}),
    },
  });

  const filters = [
    { key: "all", label: "All" },
    { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approved" },
    { key: "released", label: "Released" },
    { key: "rejected", label: "Rejected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <PageHeader
        title="Branch Requests"
        subtitle={
          canReview
            ? "Requests from branch staff for expense releases and liability payments"
            : "Your requests to accounting for expense releases and liability payments"
        }
        actions={
          <Link href="/requests/new" className="btn-primary">
            + New Request
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {filters.map((f) => {
          const active = status === f.key;
          const qs = new URLSearchParams();
          qs.set("status", f.key);
          if (scope !== "all") qs.set("scope", scope);
          return (
            <Link
              key={f.key}
              href={`/requests?${qs.toString()}`}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
                active
                  ? "bg-[var(--brand-navy)] text-white"
                  : "bg-white border border-[#d6dcec] text-[var(--brand-navy)] hover:bg-[var(--brand-bg-alt)]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        {canReview && (
          <div className="ml-auto flex gap-2">
            {[
              { key: "all", label: "All users" },
              { key: "mine", label: "Mine only" },
            ].map((s) => {
              const active = scope === s.key;
              const qs = new URLSearchParams();
              if (status !== "all") qs.set("status", status);
              qs.set("scope", s.key);
              return (
                <Link
                  key={s.key}
                  href={`/requests?${qs.toString()}`}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    active
                      ? "bg-[var(--brand-orange)] text-white"
                      : "bg-white border border-[#d6dcec] text-[var(--brand-navy)]"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Requested By</th>
                <th>Requested</th>
                <th>Needed By</th>
                <th>Amount</th>
                <th>For</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-[#4a5678] py-8">
                    No requests match this filter.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">#{r.id}</td>
                    <td>
                      <span
                        className={`badge ${
                          r.type === "expense" ? "badge-warn" : "badge-active"
                        }`}
                      >
                        {r.type === "expense"
                          ? "Expense"
                          : "Liability Pay"}
                      </span>
                    </td>
                    <td>{r.requestedBy.displayName}</td>
                    <td>{fmtDate(r.requestedAt?.slice(0, 10) ?? null)}</td>
                    <td>{fmtDate(r.neededByDate)}</td>
                    <td className="font-semibold">{fmt(r.amount)}</td>
                    <td>
                      {r.type === "expense"
                        ? r.category?.name ?? r.description ?? "—"
                        : r.liability?.name ?? "—"}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          STATUS_BADGES[r.status] ?? "warn"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/requests/${r.id}`}
                        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
                      >
                        View
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
