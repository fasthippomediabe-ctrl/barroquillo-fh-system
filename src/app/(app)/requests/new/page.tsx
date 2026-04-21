import { prisma } from "@/lib/prisma";
import { PageHeader, BackLink } from "@/components/PageHeader";
import NewRequestForm from "./NewRequestForm";
import { createRequest } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const initialType =
    sp.type === "liability_payment" ? "liability_payment" : "expense";

  const [categories, accounts, services, liabilities] = await Promise.all([
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
  ]);

  return (
    <div>
      <BackLink href="/requests" label="Back to requests" />
      <PageHeader
        title="New Request"
        subtitle="Submit a request for expense release or liability payment"
      />
      <NewRequestForm
        action={createRequest}
        initialType={initialType}
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
          monthlyPayment: l.monthlyPayment,
        }))}
      />
    </div>
  );
}
