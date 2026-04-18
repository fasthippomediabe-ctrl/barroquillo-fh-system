import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import SupplierForm from "../../SupplierForm";
import { updateSupplier } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updateSupplier(id, fd);
  }

  return (
    <div>
      <BackLink href="/suppliers" label="Back to suppliers" />
      <PageHeader title={`Edit: ${supplier!.businessName}`} />
      <SupplierForm action={action} submitLabel="Save Changes" initial={supplier!} />
    </div>
  );
}
