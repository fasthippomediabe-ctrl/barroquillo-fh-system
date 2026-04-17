import { prisma } from "@/lib/prisma";
import { PageHeader, BackLink } from "@/components/PageHeader";
import ExpenseForm from "../ExpenseForm";
import { createExpense } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const [categories, accounts, services] = await Promise.all([
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
  ]);

  return (
    <div>
      <BackLink href="/expenses" label="Back to expenses" />
      <PageHeader title="New Expense" />
      <ExpenseForm
        action={createExpense}
        submitLabel="Create Expense"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        services={services.map((s) => ({
          id: s.id,
          label: `${s.client.deceasedFirstName} ${s.client.deceasedLastName}`,
        }))}
      />
    </div>
  );
}
