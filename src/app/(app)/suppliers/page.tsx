import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: 1 },
    orderBy: { businessName: "asc" },
  });
  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} active suppliers`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.length === 0 ? (
          <div className="card md:col-span-2 text-sm text-[#4a5678]">
            No suppliers yet.
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="card">
              <h3 className="font-bold text-[var(--brand-navy)]">{s.businessName}</h3>
              {s.contactPerson && (
                <p className="text-sm text-[#4a5678]">
                  Contact: {s.contactPerson}
                  {s.phone && ` · ${s.phone}`}
                </p>
              )}
              {s.productsSupplied && (
                <p className="text-sm mt-2">
                  <span className="font-semibold">Supplies:</span> {s.productsSupplied}
                </p>
              )}
              {(s.bankName || s.gcashNumber || s.mayaNumber) && (
                <div className="mt-3 pt-3 border-t border-[#e5ebf5] text-xs text-[#4a5678]">
                  <div className="font-semibold text-[var(--brand-navy)] mb-1">
                    Payment
                  </div>
                  {s.bankName && (
                    <div>
                      🏦 {s.bankName} · {s.bankAccountName} · {s.bankAccountNumber}
                    </div>
                  )}
                  {s.gcashNumber && <div>📱 GCash: {s.gcashNumber}</div>}
                  {s.mayaNumber && <div>📱 Maya: {s.mayaNumber}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
