import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import ClientForm from "../../ClientForm";
import { updateClient } from "../../actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  async function action(fd: FormData) {
    "use server";
    await updateClient(id, fd);
  }

  return (
    <div>
      <BackLink href={`/clients/${id}`} label="Back to record" />
      <PageHeader
        title={`Edit: ${client!.deceasedFirstName} ${client!.deceasedLastName}`}
      />
      <ClientForm initial={client!} action={action} submitLabel="Save Changes" />
    </div>
  );
}
