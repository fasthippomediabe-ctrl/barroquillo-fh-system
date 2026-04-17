import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmtDate } from "@/lib/format";
import ClientsSearch from "./ClientsSearch";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { deceasedFirstName: { contains: q } },
          { deceasedLastName: { contains: q } },
          { contactName: { contains: q } },
          { contactPhone: { contains: q } },
        ],
      }
    : undefined;
  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { services: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Clients & Deceased Records"
        subtitle={`${clients.length} record${clients.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/clients/new" className="btn-primary">
            + New Record
          </Link>
        }
      />

      <ClientsSearch initial={q ?? ""} />

      <div className="card mt-4 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Deceased</th>
                <th>Age / Gender</th>
                <th>Date of Death</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Services</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    No clients found.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-semibold text-[var(--brand-navy)] hover:underline"
                      >
                        {c.deceasedFirstName} {c.deceasedMiddleName ?? ""} {c.deceasedLastName}
                      </Link>
                    </td>
                    <td>
                      {c.deceasedAge ?? "—"} / {c.deceasedGender ?? "—"}
                    </td>
                    <td>{fmtDate(c.deceasedDateOfDeath)}</td>
                    <td>
                      {c.contactName}
                      {c.contactRelationship && (
                        <div className="text-xs text-[#4a5678]">
                          {c.contactRelationship}
                        </div>
                      )}
                    </td>
                    <td>{c.contactPhone ?? "—"}</td>
                    <td>{c._count.services}</td>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
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
