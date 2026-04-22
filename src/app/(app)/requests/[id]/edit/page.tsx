import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import EditRequestForm from "./EditRequestForm";
import { listAttachments } from "@/lib/attachments";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  const me = u
    ? { id: Number(u.id), role: (u.role ?? "staff") as string }
    : null;
  if (!me) redirect("/login");

  const [r, categories, accounts, services, liabilities, attachments] =
    await Promise.all([
      prisma.branchRequest.findUnique({
        where: { id },
        include: { liability: true },
      }),
      prisma.expenseCategory.findMany({
        where: { isActive: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.account.findMany({
        where: { isActive: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        where: { status: "active" },
        include: { client: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.liability.findMany({
        where: { status: "active" },
        orderBy: { name: "asc" },
      }),
      listAttachments("branch_request", id),
    ]);
  if (!r) notFound();

  const canEdit =
    r.status === "pending" &&
    (r.requestedByUserId === me.id ||
      me.role === "admin" ||
      me.role === "accounting");
  if (!canEdit) redirect(`/requests/${id}`);

  return (
    <div>
      <BackLink href={`/requests/${id}`} label="Back to request" />
      <PageHeader
        title={`Edit Request #${id}`}
        subtitle={
          r.type === "expense" ? "Expense Release" : "Liability Payment"
        }
      />
      <EditRequestForm
        requestId={id}
        type={r.type as "expense" | "liability_payment"}
        initial={{
          amount: r.amount,
          description: r.description,
          justification: r.justification,
          neededByDate: r.neededByDate,
          categoryId: r.categoryId,
          accountId: r.accountId,
          serviceId: r.serviceId,
          liabilityId: r.liabilityId,
          reference: r.reference,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        services={services.map((s) => ({
          id: s.id,
          label: `${s.client.deceasedFirstName} ${s.client.deceasedLastName}`,
        }))}
        liabilities={liabilities.map((l) => ({
          id: l.id,
          label: `${l.name}${l.creditor ? " · " + l.creditor : ""}`,
          remainingBalance: l.remainingBalance,
        }))}
        attachments={attachments}
      />
    </div>
  );
}
