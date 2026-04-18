import { prisma } from "@/lib/prisma";
import { PageHeader, BackLink } from "@/components/PageHeader";
import ServiceForm from "../ServiceForm";
import { createService } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sp = await searchParams;
  const lockedClientId = sp.clientId ? Number(sp.clientId) : undefined;

  const [clients, packages, embalmers] = await Promise.all([
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.servicePackage.findMany({
      where: { isActive: 1 },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: 1, rateType: "per_service" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (clients.length === 0) {
    return (
      <div>
        <BackLink href="/services" label="Back to services" />
        <PageHeader title="New Service Record" />
        <div className="card">
          <p>
            Add a client record first in{" "}
            <a href="/clients/new" className="text-[var(--brand-blue)] underline">
              Clients & Deceased
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const clientOpts = clients.map((c) => ({
    id: c.id,
    label: `${c.deceasedFirstName} ${c.deceasedLastName}`,
  }));
  const pkgOpts = packages.map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice }));

  return (
    <div>
      <BackLink href="/services" label="Back to services" />
      <PageHeader title="New Service Record" />
      <ServiceForm
        action={createService}
        submitLabel="Create Service"
        clients={clientOpts}
        packages={pkgOpts}
        embalmers={embalmers.map((e) => ({
          id: e.id,
          label: `${e.lastName}, ${e.firstName}${e.position ? " (" + e.position + ")" : ""}`,
          defaultFee: e.rateAmount,
        }))}
        lockedClientId={lockedClientId}
      />
    </div>
  );
}
