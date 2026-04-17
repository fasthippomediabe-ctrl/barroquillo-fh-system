import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import LiabilityForm from "../../LiabilityForm";
import { updateLiability } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditLiabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const l = await prisma.liability.findUnique({ where: { id } });
  if (!l) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updateLiability(id, fd);
  }

  return (
    <div>
      <BackLink href={`/liabilities/${id}`} label="Back to liability" />
      <PageHeader title={`Edit: ${l!.name}`} />
      <LiabilityForm action={action} submitLabel="Save Changes" initial={l!} />
    </div>
  );
}
