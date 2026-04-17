import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    include: { category: true, account: true, service: { include: { client: true } } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 200,
  });
  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`Latest 200 entries · ${fmt(total)}`}
      />
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Description</th>
                <th>Service</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[#4a5678] py-8">
                    No expenses recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.date)}</td>
                    <td>
                      {e.category ? (
                        <span
                          className="badge"
                          style={{
                            background: (e.category.color ?? "#6c757d") + "22",
                            color: e.category.color ?? "#6c757d",
                          }}
                        >
                          {e.category.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="font-semibold">{fmt(e.amount)}</td>
                    <td>{e.account?.name ?? "—"}</td>
                    <td>{e.description ?? "—"}</td>
                    <td>
                      {e.service
                        ? `${e.service.client.deceasedFirstName} ${e.service.client.deceasedLastName}`
                        : "—"}
                    </td>
                    <td>{e.reference ?? "—"}</td>
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
