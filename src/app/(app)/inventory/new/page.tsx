import { prisma } from "@/lib/prisma";
import { PageHeader, BackLink } from "@/components/PageHeader";
import InventoryForm from "../InventoryForm";
import { createInventoryItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  const categories = await prisma.inventoryCategory.findMany({
    where: { isActive: 1 },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <BackLink href="/inventory" label="Back to inventory" />
      <PageHeader title="New Inventory Item" />
      <InventoryForm
        action={createInventoryItem}
        submitLabel="Create Item"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
