import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import PrintButton from "@/components/PrintButton";
import { listAttachmentsMany } from "@/lib/attachments";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ServiceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role;
  if (!["admin", "accounting"].includes(role)) {
    const { id: idStr } = await params;
    redirect(`/services/${idStr}`);
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [service, expenses, shares] = await Promise.all([
    prisma.service.findUnique({
      where: { id },
      include: {
        client: true,
        package: true,
        embalmer: true,
        payments: { orderBy: [{ date: "asc" }, { id: "asc" }] },
      },
    }),
    prisma.expense.findMany({
      where: { serviceId: id },
      include: { category: true, account: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
    prisma.profitShare.findMany({
      where: { isActive: 1 },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!service) notFound();

  const expenseAttachMap = await listAttachmentsMany(
    "expense",
    expenses.map((e) => e.id),
  );

  const totalRevenue = service.payments.reduce((a, p) => a + p.amount, 0);
  const totalDirectExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const netAmount = service.totalAmount - service.discount;
  const balance = netAmount - totalRevenue;
  const profit = totalRevenue - totalDirectExpenses;
  const distributions = shares.map((s) => ({
    name: s.name,
    percent: s.percent,
    amount: (profit * s.percent) / 100,
    bankInfo: s.bankInfo,
  }));

  const deceasedName =
    `${service.client.deceasedFirstName} ${service.client.deceasedMiddleName ?? ""} ${service.client.deceasedLastName}`
      .replace(/\s+/g, " ")
      .trim();

  return (
    <div>
      <div className="no-print">
        <BackLink href={`/services/${id}`} label="Back to service" />
        <PageHeader
          title="Service Report"
          subtitle={deceasedName}
          actions={<PrintButton label="Print / Save as PDF" />}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-4 border-b-2 border-[var(--brand-navy)] pb-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={60}
            height={60}
            className="rounded-full"
          />
          <div className="flex-1">
            <div className="text-xl font-bold">L.E. BARROQUILLO FUNERAL HOMES</div>
            <div className="text-sm">Service Report</div>
          </div>
          <div className="text-xs text-right">
            Generated {new Date().toLocaleDateString("en-PH")}
          </div>
        </div>
      </div>

      <section className="card mb-6">
        <h2 className="font-bold mb-3">Service Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Info label="Deceased">{deceasedName}</Info>
          <Info label="Service ID">#{service.id}</Info>
          <Info label="Package">
            {service.package?.name ?? service.customServiceName ?? "Custom"}
          </Info>
          <Info label="Status">
            <span className={`badge badge-${service.status}`}>
              {service.status}
            </span>
          </Info>
          <Info label="Wake">
            {fmtDate(service.wakeStartDate)} — {fmtDate(service.wakeEndDate)}
          </Info>
          <Info label="Burial / Cremation">
            {fmtDate(service.burialDate)} · {service.burialLocation ?? "TBD"}
          </Info>
          <Info label="Contact">
            {service.client.contactName}
            {service.client.contactPhone && ` · ${service.client.contactPhone}`}
          </Info>
          <Info label="Embalmer">
            {service.embalmer
              ? `${service.embalmer.lastName}, ${service.embalmer.firstName} (₱${service.embalmerFee.toFixed(2)})`
              : "—"}
          </Info>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Pricing &amp; Balance</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">Total Service Amount</td>
              <td className="py-2 pr-2 text-right font-semibold">
                {fmt(service.totalAmount)}
              </td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2">− Discount</td>
              <td className="py-2 pr-2 text-right text-[#c0392b]">
                {fmt(service.discount)}
              </td>
            </tr>
            <tr className="border-b-2 border-[var(--brand-navy)] font-bold">
              <td className="py-2 pl-2">= Net Amount Due</td>
              <td className="py-2 pr-2 text-right">{fmt(netAmount)}</td>
            </tr>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2 text-[#27613a]">− Total Paid</td>
              <td className="py-2 pr-2 text-right text-[#27613a] font-semibold">
                {fmt(totalRevenue)}
              </td>
            </tr>
            <tr className="font-bold text-lg bg-[var(--brand-bg-alt)]">
              <td className="py-3 pl-2">
                = {balance > 0 ? "Outstanding Balance" : "Settled"}
              </td>
              <td
                className={`py-3 pr-2 text-right ${balance > 0 ? "text-[#c0392b]" : "text-[#27613a]"}`}
              >
                {fmt(balance)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Payments Received</h2>
        {service.payments.length === 0 ? (
          <p className="text-sm text-[#4a5678]">No payments recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {service.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td className="capitalize">{p.method.replace("_", " ")}</td>
                    <td>{p.reference ?? "—"}</td>
                    <td>{p.notes ?? "—"}</td>
                    <td className="font-semibold text-[#27613a]">
                      {fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={4}>Total Payments Received</td>
                  <td className="text-[#27613a]">{fmt(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Linked Expenses (direct costs)</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No expenses linked to this service.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Receipts</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const atts = expenseAttachMap.get(e.id) ?? [];
                  const receiptCount =
                    atts.length + (e.receiptUrl ? 1 : 0);
                  return (
                    <tr key={e.id}>
                      <td>{fmtDate(e.date)}</td>
                      <td>
                        {e.category ? (
                          <span
                            className="badge"
                            style={{
                              background:
                                (e.category.color ?? "#6c757d") + "22",
                              color: e.category.color ?? "#6c757d",
                            }}
                          >
                            {e.category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{e.description ?? "—"}</td>
                      <td>{e.reference ?? "—"}</td>
                      <td>
                        {receiptCount === 0 ? (
                          "—"
                        ) : (
                          <span className="text-xs">
                            📎 {receiptCount} attached
                          </span>
                        )}
                      </td>
                      <td className="font-semibold text-[#c0392b]">
                        {fmt(e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-[var(--brand-bg-alt)]">
                  <td colSpan={5}>Total Direct Expenses</td>
                  <td className="text-[#c0392b]">{fmt(totalDirectExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Profit &amp; Share Distribution</h2>
        <table className="w-full text-sm mb-4">
          <tbody>
            <tr className="border-b border-[#e5ebf5]">
              <td className="py-2 pl-2 text-[#27613a]">+ Revenue Received</td>
              <td className="py-2 pr-2 text-right font-semibold text-[#27613a]">
                {fmt(totalRevenue)}
              </td>
            </tr>
            <tr className="border-b-2 border-[var(--brand-navy)]">
              <td className="py-2 pl-2 text-[#c0392b]">
                − Linked Direct Expenses
              </td>
              <td className="py-2 pr-2 text-right font-semibold text-[#c0392b]">
                {fmt(totalDirectExpenses)}
              </td>
            </tr>
            <tr className="font-bold text-lg bg-[var(--brand-bg-alt)]">
              <td className="py-3 pl-2">
                = Net Profit {profit < 0 && "(Loss)"}
              </td>
              <td
                className={`py-3 pr-2 text-right ${profit < 0 ? "text-[#c0392b]" : "text-[#27613a]"}`}
              >
                {fmt(profit)}
              </td>
            </tr>
          </tbody>
        </table>

        {distributions.length === 0 ? (
          <p className="text-sm text-[#4a5678]">
            No active profit shares configured. Set them in{" "}
            <Link href="/admin" className="text-[var(--brand-blue)] underline">
              Admin Panel
            </Link>
            .
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Share</th>
                <th>%</th>
                <th>Amount</th>
                <th>Bank / Payout</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.name}>
                  <td className="font-semibold">{d.name}</td>
                  <td>{d.percent}%</td>
                  <td
                    className={`font-bold ${d.amount < 0 ? "text-[#c0392b]" : ""}`}
                  >
                    {fmt(d.amount)}
                  </td>
                  <td className="text-xs text-[#4a5678]">
                    {d.bankInfo ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {balance > 0 && (
          <p className="mt-3 text-xs bg-[#fbdcdc] text-[#7a2323] rounded px-3 py-2">
            <strong>Note:</strong> {fmt(balance)} is still outstanding from
            the family. The shares above are computed on what&apos;s actually
            been paid so far. Once the balance is settled, recompute the
            report to see the final split.
          </p>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-bold mb-4">Notes</h2>
        <p className="text-sm whitespace-pre-wrap">
          {service.notes ?? <em className="text-[#4a5678]">No notes.</em>}
        </p>
      </section>

      <div className="hidden print:block mt-8 pt-4 border-t border-[#e5ebf5] text-xs text-[#4a5678]">
        <p>
          Report generated on{" "}
          {new Date().toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          · L.E. Barroquillo Funeral Homes Management System
        </p>
      </div>
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <div className="w-40 text-[#4a5678] shrink-0">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
