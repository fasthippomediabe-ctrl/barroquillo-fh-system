import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import InventoryForm from "../../InventoryForm";
import { updateInventoryItem } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const [item, categories] = await Promise.all([
    prisma.inventory.findUnique({ where: { id } }),
    prisma.inventoryCategory.findMany({
      where: { isActive: 1 },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!item) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updateInventoryItem(id, fd);
  }

  return (
    <div>
      <BackLink href="/inventory" label="Back to inventory" />
      <PageHeader title={`Edit: ${item!.name}`} />
      <InventoryForm
        action={action}
        submitLabel="Save Changes"
        initial={item!}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
