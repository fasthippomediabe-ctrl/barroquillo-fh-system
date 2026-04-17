import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import ServiceForm from "../../ServiceForm";
import { updateService } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [svc, clients, packages] = await Promise.all([
    prisma.service.findUnique({ where: { id }, include: { client: true } }),
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.servicePackage.findMany({ where: { isActive: 1 }, orderBy: { name: "asc" } }),
  ]);
  if (!svc) notFound();

  async function action(fd: FormData) {
    "use server";
    await updateService(id, fd);
  }

  return (
    <div>
      <BackLink href={`/services/${id}`} label="Back to service" />
      <PageHeader
        title={`Edit Service: ${svc!.client.deceasedFirstName} ${svc!.client.deceasedLastName}`}
      />
      <ServiceForm
        action={action}
        submitLabel="Save Changes"
        clients={clients.map((c) => ({
          id: c.id,
          label: `${c.deceasedFirstName} ${c.deceasedLastName}`,
        }))}
        packages={packages.map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice }))}
        initial={svc!}
        lockedClientId={svc!.clientId}
      />
    </div>
  );
}
