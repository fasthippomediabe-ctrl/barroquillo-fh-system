import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import EmployeeActions from "./EmployeeActions";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) notFound();

  return (
    <div>
      <BackLink href="/employees" label="Back to employees" />
      <PageHeader
        title={`${emp.lastName}, ${emp.firstName} ${emp.middleName ?? ""}`}
        subtitle={`${emp.position ?? "—"} · ${emp.department ?? "—"}`}
        actions={
          <>
            <Link href={`/employees/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <EmployeeActions id={id} isActive={emp.isActive === 1} />
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <section className="card">
          <h3 className="font-bold mb-3">Employment</h3>
          <Info label="Employment Type">{emp.employmentType}</Info>
          <Info label="Rate">
            {fmt(emp.rateAmount)} / {emp.rateType}
          </Info>
          <Info label="Date Hired">{fmtDate(emp.dateHired)}</Info>
          <Info label="Date Regularized">{fmtDate(emp.dateRegularized)}</Info>
          {emp.isActive === 0 && (
            <>
              <Info label="Date Separated">{fmtDate(emp.dateSeparated)}</Info>
              <Info label="Separation Reason">{emp.separationReason ?? "—"}</Info>
            </>
          )}
        </section>

        <section className="card">
          <h3 className="font-bold mb-3">Personal</h3>
          <Info label="Birthday">{fmtDate(emp.birthday)}</Info>
          <Info label="Gender">{emp.gender ?? "—"}</Info>
          <Info label="Civil Status">{emp.civilStatus ?? "—"}</Info>
          <Info label="Phone">{emp.phone ?? "—"}</Info>
          <Info label="Email">{emp.email ?? "—"}</Info>
          <Info label="Address">{emp.address ?? "—"}</Info>
        </section>

        <section className="card">
          <h3 className="font-bold mb-3">Government IDs</h3>
          <Info label="SSS">{emp.sssNumber ?? "—"}</Info>
          <Info label="PhilHealth">{emp.philhealthNumber ?? "—"}</Info>
          <Info label="Pag-IBIG">{emp.pagibigNumber ?? "—"}</Info>
          <Info label="TIN">{emp.tinNumber ?? "—"}</Info>
        </section>

        <section className="card">
          <h3 className="font-bold mb-3">Emergency Contact</h3>
          <Info label="Name">{emp.emergencyName ?? "—"}</Info>
          <Info label="Relationship">{emp.emergencyRelationship ?? "—"}</Info>
          <Info label="Phone">{emp.emergencyPhone ?? "—"}</Info>
        </section>
      </div>

      {(emp.education || emp.skills || emp.notes) && (
        <section className="card mb-4">
          <h3 className="font-bold mb-3">201 File</h3>
          {emp.education && (
            <div className="mb-3">
              <div className="text-xs text-[#4a5678] font-semibold uppercase">Education</div>
              <p className="whitespace-pre-wrap text-sm">{emp.education}</p>
            </div>
          )}
          {emp.skills && (
            <div className="mb-3">
              <div className="text-xs text-[#4a5678] font-semibold uppercase">Skills</div>
              <p className="whitespace-pre-wrap text-sm">{emp.skills}</p>
            </div>
          )}
          {emp.notes && (
            <div>
              <div className="text-xs text-[#4a5678] font-semibold uppercase">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{emp.notes}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-[#e5ebf5] last:border-0 text-sm">
      <div className="w-40 text-[#4a5678] shrink-0">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
