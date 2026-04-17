import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showInactive = view === "all";
  const employees = await prisma.employee.findMany({
    where: showInactive ? undefined : { isActive: 1 },
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.filter((e) => e.isActive === 1).length} active${showInactive ? ` · ${employees.length} total` : ""}`}
        actions={
          <>
            <Link
              href={`/employees?view=${showInactive ? "active" : "all"}`}
              className="btn-secondary"
            >
              {showInactive ? "Active only" : "Show inactive"}
            </Link>
            <Link href="/employees/new" className="btn-primary">
              + New Employee
            </Link>
          </>
        }
      />

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Department</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Hired</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    No employees yet.
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr
                    key={e.id}
                    className={e.isActive === 0 ? "opacity-60" : ""}
                  >
                    <td>
                      <Link
                        href={`/employees/${e.id}`}
                        className="font-semibold text-[var(--brand-navy)] hover:underline"
                      >
                        {e.lastName}, {e.firstName}{" "}
                        {e.middleName ? e.middleName[0] + "." : ""}
                      </Link>
                    </td>
                    <td>{e.position ?? "—"}</td>
                    <td>{e.department ?? "—"}</td>
                    <td className="capitalize">{e.employmentType}</td>
                    <td>
                      {fmt(e.rateAmount)} <span className="text-xs text-[#4a5678]">/ {e.rateType}</span>
                    </td>
                    <td>{fmtDate(e.dateHired)}</td>
                    <td>
                      {e.isActive === 1 ? (
                        <span className="badge badge-active">active</span>
                      ) : (
                        <span className="badge badge-cancelled">separated</span>
                      )}
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
