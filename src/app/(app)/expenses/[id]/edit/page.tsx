import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import ExpenseForm from "../../ExpenseForm";
import { updateExpense } from "../../actions";
import { listAttachments } from "@/lib/attachments";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager", "accounting"].includes(role)) redirect("/expenses");

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [expense, categories, accounts, services, attachments] =
    await Promise.all([
      prisma.expense.findUnique({ where: { id } }),
      prisma.expenseCategory.findMany({
        where: { isActive: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.account.findMany({
        where: { isActive: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      listAttachments("expense", id),
    ]);
  if (!expense) notFound();

  async function action(fd: FormData) {
    "use server";
    return await updateExpense(id, fd);
  }

  return (
    <div>
      <BackLink href="/expenses" label="Back to expenses" />
      <PageHeader title={`Edit Expense #${id}`} />
      <ExpenseForm
        action={action}
        submitLabel="Save Changes"
        initial={expense!}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        services={services.map((s) => ({
          id: s.id,
          label: `${s.client.deceasedFirstName} ${s.client.deceasedLastName}`,
        }))}
        attachments={attachments}
      />
    </div>
  );
}
