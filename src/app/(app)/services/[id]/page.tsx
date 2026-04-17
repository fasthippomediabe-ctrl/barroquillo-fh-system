import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import { getServiceBalance } from "@/lib/queries";
import PaymentForm from "./PaymentForm";
import StatusActions from "./StatusActions";
import DeletePaymentButton from "./DeletePaymentButton";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const svc = await prisma.service.findUnique({
    where: { id },
    include: {
      client: true,
      package: true,
      payments: { orderBy: [{ date: "desc" }, { id: "desc" }] },
    },
  });
  if (!svc) notFound();

  const bal = await getServiceBalance(id);
  const net = svc.totalAmount - svc.discount;
  const paid = net - bal;
  const pct = net > 0 ? Math.min(1, paid / net) : 0;

  return (
    <div>
      <BackLink href="/services" label="Back to services" />
      <PageHeader
        title={`${svc.client.deceasedFirstName} ${svc.client.deceasedLastName}`}
        subtitle={`Service #${svc.id} · ${svc.package?.name ?? svc.customServiceName ?? "Custom"}`}
        actions={
          <>
            <Link href={`/services/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <PrintButton />
            <StatusActions id={id} currentStatus={svc.status} />
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <h3 className="font-bold mb-3">Pricing</h3>
          <Info label="Total Amount">{fmt(svc.totalAmount)}</Info>
          <Info label="Discount">{fmt(svc.discount)}</Info>
          <Info label="Net Amount">{fmt(net)}</Info>
          <Info label="Paid">{fmt(paid)}</Info>
          <Info label="Balance">
            <span className={bal > 0 ? "text-[#c0392b] font-bold" : "text-[#27613a] font-bold"}>
              {fmt(bal)}
            </span>
          </Info>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-[#e5ebf5] overflow-hidden">
              <div
                className="h-full bg-[var(--brand-orange)] transition-all"
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
            <div className="text-xs text-[#4a5678] mt-1">
              {Math.round(pct * 100)}% paid
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="font-bold mb-3">Schedule & Contact</h3>
          <Info label="Wake">
            {fmtDate(svc.wakeStartDate)} — {fmtDate(svc.wakeEndDate)}
          </Info>
          <Info label="Burial / Cremation">{fmtDate(svc.burialDate)}</Info>
          <Info label="Location">{svc.burialLocation ?? "TBD"}</Info>
          <Info label="Status">
            <span className={`badge badge-${svc.status}`}>{svc.status}</span>
          </Info>
          <Info label="Contact">
            <Link
              href={`/clients/${svc.client.id}`}
              className="text-[var(--brand-blue)] hover:underline"
            >
              {svc.client.contactName}
            </Link>
            {svc.client.contactPhone && (
              <span className="text-[#4a5678]"> · {svc.client.contactPhone}</span>
            )}
          </Info>
        </section>
      </div>

      {svc.notes && (
        <section className="card mb-6">
          <h3 className="font-bold mb-2">Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{svc.notes}</p>
        </section>
      )}

      <section className="card mb-6 no-print">
        <h3 className="font-bold mb-4">Record Payment</h3>
        <PaymentForm serviceId={id} />
      </section>

      <section className="card">
        <h3 className="font-bold mb-4">Payment History</h3>
        {svc.payments.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No payments recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {svc.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td className="font-semibold">{fmt(p.amount)}</td>
                    <td className="capitalize">{p.method}</td>
                    <td>{p.reference ?? "—"}</td>
                    <td>{p.notes ?? "—"}</td>
                    <td className="no-print">
                      <div className="flex gap-2">
                        <Link
                          href={`/payments/${p.id}/edit`}
                          className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
                        >
                          Edit
                        </Link>
                        <DeletePaymentButton paymentId={p.id} serviceId={id} />
                      </div>
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

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-[#e5ebf5] last:border-0 text-sm">
      <div className="w-36 text-[#4a5678] shrink-0">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
