import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import EmployeeForm from "../../EmployeeForm";
import { updateEmployee } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updateEmployee(id, fd);
  }

  return (
    <div>
      <BackLink href={`/employees/${id}`} label="Back to employee" />
      <PageHeader
        title={`Edit: ${emp!.firstName} ${emp!.lastName}`}
      />
      <EmployeeForm action={action} submitLabel="Save Changes" initial={emp!} />
    </div>
  );
}
