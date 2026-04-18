import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import LiabilityPaymentForm from "./LiabilityPaymentForm";
import DeleteLiabilityButton from "./DeleteLiabilityButton";
import DeletePaymentButton from "./DeletePaymentButton";
import { listAttachmentsMany } from "@/lib/attachments";

export const dynamic = "force-dynamic";

export default async function LiabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const l = await prisma.liability.findUnique({
    where: { id },
    include: { payments: { orderBy: [{ date: "desc" }, { id: "desc" }] } },
  });
  if (!l) notFound();
  const attachMap = await listAttachmentsMany(
    "liability_payment",
    l.payments.map((p) => p.id),
  );

  const paid = l.principalAmount - l.remainingBalance;
  const pct = l.principalAmount > 0 ? paid / l.principalAmount : 0;

  return (
    <div>
      <BackLink href="/liabilities" label="Back to liabilities" />
      <PageHeader
        title={l.name}
        subtitle={`${l.type.replace("_", " ")} · ${l.creditor ?? "—"}`}
        actions={
          <>
            <Link href={`/liabilities/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <DeleteLiabilityButton id={id} hasPayments={l.payments.length > 0} />
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <h3 className="font-bold mb-3">Balance</h3>
          <Info label="Principal">{fmt(l.principalAmount)}</Info>
          <Info label="Paid">{fmt(paid)}</Info>
          <Info label="Remaining">
            <span className={l.remainingBalance > 0 ? "text-[#c0392b] font-bold" : "text-[#27613a] font-bold"}>
              {fmt(l.remainingBalance)}
            </span>
          </Info>
          <Info label="Interest Rate">{l.interestRate}%</Info>
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
          <h3 className="font-bold mb-3">Schedule</h3>
          <Info label="Monthly Payment">{fmt(l.monthlyPayment)}</Info>
          <Info label="Due Date">{fmtDate(l.dueDate)}</Info>
          <Info label="Status">
            <span className={`badge badge-${l.status === "active" ? "warn" : l.status === "paid" ? "active" : "cancelled"}`}>
              {l.status}
            </span>
          </Info>
        </section>
      </div>

      {l.notes && (
        <section className="card mb-6">
          <h3 className="font-bold mb-2">Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{l.notes}</p>
        </section>
      )}

      <section className="card mb-6 no-print">
        <h3 className="font-bold mb-4">Record Payment</h3>
        <LiabilityPaymentForm liabilityId={id} />
      </section>

      <section className="card">
        <h3 className="font-bold mb-4">Payment History</h3>
        {l.payments.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No payments recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Receipts</th>
                  <th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {l.payments.map((p) => {
                  const atts = attachMap.get(p.id) ?? [];
                  return (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      <td className="font-semibold">{fmt(p.amount)}</td>
                      <td>{p.notes ?? "—"}</td>
                      <td>
                        {atts.length === 0 ? (
                          "—"
                        ) : (
                          <details>
                            <summary className="cursor-pointer text-[var(--brand-blue)] text-xs font-semibold">
                              📎 {atts.length}
                            </summary>
                            <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                              {atts.map((a) => (
                                <li key={a.id}>
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--brand-blue)] hover:underline"
                                  >
                                    {a.filename}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td className="no-print">
                        <div className="flex gap-2">
                          <Link
                            href={`/liabilities/${id}/payments/${p.id}/edit`}
                            className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
                          >
                            Edit
                          </Link>
                          <DeletePaymentButton
                            paymentId={p.id}
                            liabilityId={id}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
