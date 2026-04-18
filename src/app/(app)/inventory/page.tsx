import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt } from "@/lib/format";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showAll = view === "all";
  const items = await prisma.inventory.findMany({
    where: showAll ? undefined : { isActive: 1 },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const totalValue = items.reduce(
    (a, i) => a + i.quantity * i.costPerUnit,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.filter((i) => i.isActive === 1).length} active items · Total value ${fmt(totalValue)}`}
        actions={
          <>
            <Link
              href={`/inventory?view=${showAll ? "active" : "all"}`}
              className="btn-secondary"
            >
              {showAll ? "Active only" : "Show inactive"}
            </Link>
            <Link href="/inventory/new" className="btn-primary">
              + New Item
            </Link>
          </>
        }
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-[#4a5678] py-8">
                    No inventory items. Click <strong>+ New Item</strong>.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr
                    key={i.id}
                    className={i.isActive === 0 ? "opacity-60" : ""}
                  >
                    <td className="font-semibold">{i.name}</td>
                    <td>{i.category?.name ?? "—"}</td>
                    <td>{i.location ?? "—"}</td>
                    <td
                      className={
                        i.quantity <= i.reorderLevel && i.reorderLevel > 0
                          ? "text-[#c0392b] font-bold"
                          : ""
                      }
                    >
                      {i.quantity}
                    </td>
                    <td>{i.unit}</td>
                    <td>{fmt(i.costPerUnit)}</td>
                    <td>{fmt(i.sellingPrice)}</td>
                    <td>{i.reorderLevel}</td>
                    <td>
                      <RowActions id={i.id} isActive={i.isActive === 1} />
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
