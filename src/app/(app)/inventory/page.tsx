import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await prisma.inventory.findMany({
    where: { isActive: 1 },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const totalValue = items.reduce((a, i) => a + i.quantity * i.costPerUnit, 0);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} active items · Total value ${fmt(totalValue)}`}
      />
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Cost/Unit</th>
                <th>Selling</th>
                <th>Reorder At</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-[#4a5678] py-8">
                    No inventory items.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-semibold">{i.name}</td>
                    <td>{i.category?.name ?? "—"}</td>
                    <td>{i.location ?? "—"}</td>
                    <td
                      className={
                        i.quantity <= i.reorderLevel ? "text-[#c0392b] font-bold" : ""
                      }
                    >
                      {i.quantity}
                    </td>
                    <td>{i.unit}</td>
                    <td>{fmt(i.costPerUnit)}</td>
                    <td>{fmt(i.sellingPrice)}</td>
                    <td>{i.reorderLevel}</td>
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
