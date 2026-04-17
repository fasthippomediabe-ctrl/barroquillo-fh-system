import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const packages = await prisma.servicePackage.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="Service Packages"
        subtitle={`${packages.filter((p) => p.isActive === 1).length} active packages`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.length === 0 ? (
          <div className="card md:col-span-3 text-sm text-[#4a5678]">
            No service packages defined.
          </div>
        ) : (
          packages.map((p) => (
            <div key={p.id} className={`card ${p.isActive === 0 ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[var(--brand-navy)]">{p.name}</h3>
                {p.isActive === 0 && <span className="badge badge-cancelled">Inactive</span>}
              </div>
              <div className="text-2xl font-bold text-[var(--brand-orange)]">
                {fmt(p.basePrice)}
              </div>
              {p.description && (
                <p className="text-sm text-[#4a5678] mt-2 whitespace-pre-wrap">
                  {p.description}
                </p>
              )}
              <div className="text-xs text-[#4a5678] mt-3 pt-3 border-t border-[#e5ebf5]">
                Used in {p._count.services} service{p._count.services === 1 ? "" : "s"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
