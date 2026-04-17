import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import PeriodForm from "../../PeriodForm";
import { updatePeriod } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditPeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updatePeriod(id, fd);
  }

  return (
    <div>
      <BackLink href={`/payroll/${id}`} label="Back to period" />
      <PageHeader title={`Edit: ${period!.periodName}`} />
      <PeriodForm
        action={action}
        submitLabel="Save Changes"
        initial={period!}
      />
    </div>
  );
}
