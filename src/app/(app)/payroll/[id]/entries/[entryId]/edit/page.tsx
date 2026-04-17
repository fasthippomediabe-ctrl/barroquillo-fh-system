import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import EntryEditForm from "./EntryEditForm";

export const dynamic = "force-dynamic";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id: idStr, entryId: entryIdStr } = await params;
  const id = Number(idStr);
  const entryId = Number(entryIdStr);
  if (!Number.isFinite(id) || !Number.isFinite(entryId)) notFound();

  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: { employee: true, period: true },
  });
  if (!entry) notFound();

  return (
    <div>
      <BackLink href={`/payroll/${id}`} label="Back to period" />
      <PageHeader
        title={`Edit Entry — ${entry.employee.lastName}, ${entry.employee.firstName}`}
        subtitle={entry.period.periodName}
      />
      <EntryEditForm entryId={entryId} initial={entry} />
    </div>
  );
}
