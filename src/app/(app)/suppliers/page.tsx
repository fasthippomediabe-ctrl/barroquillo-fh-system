import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import SupplierActions from "./SupplierActions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showAll = view === "all";
  const suppliers = await prisma.supplier.findMany({
    where: showAll ? undefined : { isActive: 1 },
    orderBy: [{ isActive: "desc" }, { businessName: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.filter((s) => s.isActive === 1).length} active${showAll ? ` · ${suppliers.length} total` : ""}`}
        actions={
          <>
            <Link
              href={`/suppliers?view=${showAll ? "active" : "all"}`}
              className="btn-secondary"
            >
              {showAll ? "Active only" : "Show inactive"}
            </Link>
            <Link href="/suppliers/new" className="btn-primary">
              + New Supplier
            </Link>
          </>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.length === 0 ? (
          <div className="card md:col-span-2 text-sm text-[#4a5678]">
            No suppliers yet. Click <strong>+ New Supplier</strong>.
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className={`card ${s.isActive === 0 ? "opacity-60" : ""}`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-[var(--brand-navy)]">
                  {s.businessName}
                </h3>
                <SupplierActions id={s.id} isActive={s.isActive === 1} />
              </div>
              {s.contactPerson && (
                <p className="text-sm text-[#4a5678]">
                  Contact: {s.contactPerson}
                  {s.phone && ` · ${s.phone}`}
                </p>
              )}
              {s.productsSupplied && (
                <p className="text-sm mt-2">
                  <span className="font-semibold">Supplies:</span>{" "}
                  {s.productsSupplied}
                </p>
              )}
              {(s.bankName || s.gcashNumber || s.mayaNumber) && (
                <div className="mt-3 pt-3 border-t border-[#e5ebf5] text-xs text-[#4a5678]">
                  <div className="font-semibold text-[var(--brand-navy)] mb-1">
                    Payment
                  </div>
                  {s.bankName && (
                    <div>
                      🏦 {s.bankName} · {s.bankAccountName} ·{" "}
                      {s.bankAccountNumber}
                    </div>
                  )}
                  {s.gcashNumber && <div>📱 GCash: {s.gcashNumber}</div>}
                  {s.mayaNumber && <div>📱 Maya: {s.mayaNumber}</div>}
                </div>
              )}
              {s.paymentTerms && (
                <div className="mt-2 text-xs text-[#4a5678]">
                  Terms: {s.paymentTerms}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
