import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import RowActions from "./RowActions";
import { listAttachmentsMany } from "@/lib/attachments";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  const canDirectCreate = ["admin", "manager", "accounting"].includes(role);

  const expenses = await prisma.expense.findMany({
    include: {
      category: true,
      account: true,
      service: { include: { client: true } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 200,
  });
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const attachMap = await listAttachmentsMany(
    "expense",
    expenses.map((e) => e.id),
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`Latest 200 entries · ${fmt(total)}`}
        actions={
          canDirectCreate ? (
            <Link href="/expenses/new" className="btn-primary">
              + New Expense
            </Link>
          ) : (
            <Link
              href="/requests/new?type=expense"
              className="btn-primary"
              title="Branch staff must submit expenses as requests for accounting to review and release"
            >
              + Submit Expense Request
            </Link>
          )
        }
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
                <th>Receipt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-[#4a5678] py-8">
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
                    <td>
                      <ReceiptCell
                        receiptUrl={e.receiptUrl}
                        receiptFilename={e.receiptFilename}
                        attachments={attachMap.get(e.id) ?? []}
                      />
                    </td>
                    <td>
                      <RowActions id={e.id} />
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

function ReceiptCell({
  receiptUrl,
  receiptFilename,
  attachments,
}: {
  receiptUrl: string | null;
  receiptFilename: string | null;
  attachments: { id: number; url: string; filename: string }[];
}) {
  const items: { url: string; filename: string | null }[] = [];
  if (receiptUrl)
    items.push({ url: receiptUrl, filename: receiptFilename });
  for (const a of attachments)
    items.push({ url: a.url, filename: a.filename });
  if (items.length === 0) return <span>—</span>;
  const [first, ...rest] = items;
  return (
    <div className="flex flex-col gap-0.5">
      <a
        href={first.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
        title={first.filename ?? "View receipt"}
      >
        📎 {items.length === 1 ? "View" : `${items.length} files`}
      </a>
      {rest.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[#4a5678]">
            show all
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {items.map((it, i) => (
              <li key={i}>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-blue)] hover:underline"
                >
                  {it.filename ?? `Receipt ${i + 1}`}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
