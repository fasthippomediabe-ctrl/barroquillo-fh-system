import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import { getServiceBalances } from "@/lib/queries";
import DeleteButton from "./DeleteButton";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      services: {
        include: { package: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) notFound();

  const balances = await getServiceBalances(client.services.map((s) => s.id));

  return (
    <div>
      <BackLink href="/clients" label="Back to clients" />
      <PageHeader
        title={`${client.deceasedFirstName} ${client.deceasedLastName}`}
        subtitle={`Record #${client.id} · Added ${fmtDate(client.createdAt)}`}
        actions={
          <>
            <Link href={`/clients/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <PrintButton />
            <DeleteButton id={id} />
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section className="card">
          <h3 className="font-bold mb-3 text-[var(--brand-navy)]">Deceased</h3>
          <Info label="Full Name">
            {client.deceasedFirstName} {client.deceasedMiddleName ?? ""}{" "}
            {client.deceasedLastName}
          </Info>
          <Info label="Age / Gender">
            {client.deceasedAge ?? "—"} / {client.deceasedGender ?? "—"}
          </Info>
          <Info label="Birthday">{fmtDate(client.deceasedBirthday)}</Info>
          <Info label="Date of Death">{fmtDate(client.deceasedDateOfDeath)}</Info>
          <Info label="Cause of Death">{client.deceasedCauseOfDeath ?? "—"}</Info>
          <Info label="Address">{client.deceasedAddress ?? "—"}</Info>
        </section>

        <section className="card">
          <h3 className="font-bold mb-3 text-[var(--brand-navy)]">Contact / Family</h3>
          <Info label="Contact Name">{client.contactName}</Info>
          <Info label="Relationship">{client.contactRelationship ?? "—"}</Info>
          <Info label="Phone">{client.contactPhone ?? "—"}</Info>
          <Info label="Email">{client.contactEmail ?? "—"}</Info>
          <Info label="Address">{client.contactAddress ?? "—"}</Info>
        </section>
      </div>

      {client.notes && (
        <section className="card mb-6">
          <h3 className="font-bold mb-2 text-[var(--brand-navy)]">Notes</h3>
          <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
        </section>
      )}

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--brand-navy)]">Services</h3>
          <Link href={`/services/new?clientId=${id}`} className="btn-primary">
            + Add Service
          </Link>
        </div>
        {client.services.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No services yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Wake</th>
                  <th>Burial</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {client.services.map((s) => {
                  const bal = balances.get(s.id) ?? 0;
                  return (
                    <tr key={s.id}>
                      <td>{s.package?.name ?? s.customServiceName ?? "Custom"}</td>
                      <td>{fmtDate(s.wakeStartDate)}</td>
                      <td>{fmtDate(s.burialDate)}</td>
                      <td>{fmt(s.totalAmount)}</td>
                      <td className={bal > 0 ? "text-[#c0392b] font-semibold" : ""}>
                        {fmt(bal)}
                      </td>
                      <td>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </td>
                      <td>
                        <Link
                          href={`/services/${s.id}`}
                          className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
                        >
                          View
                        </Link>
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
