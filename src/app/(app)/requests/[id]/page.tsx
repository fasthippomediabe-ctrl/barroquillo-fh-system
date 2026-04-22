import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { fmt, fmtDate } from "@/lib/format";
import { listAttachments } from "@/lib/attachments";
import ReviewActions from "./ReviewActions";
import CancelButton from "./CancelButton";
import CommentThread from "./CommentThread";
import DeleteRequestButton from "./DeleteRequestButton";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  pending: "warn",
  approved: "active",
  released: "active",
  rejected: "cancelled",
  cancelled: "cancelled",
};

export default async function RequestDetailPage({
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
  if (!me) return null;

  const canReview = me.role === "admin" || me.role === "accounting";

  const [r, attachments, comments] = await Promise.all([
    prisma.branchRequest.findUnique({
      where: { id },
      include: {
        requestedBy: true,
        reviewer: true,
        releasedBy: true,
        liability: true,
        category: true,
        account: true,
        service: { include: { client: true } },
      },
    }),
    listAttachments("branch_request", id),
    prisma.requestComment.findMany({
      where: { requestId: id },
      include: { user: true },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!r) notFound();

  const isOwner = r.requestedByUserId === me.id;
  const isAdmin = me.role === "admin";
  const canComment = isOwner || canReview || me.role === "manager";
  const canDelete =
    isAdmin &&
    (r.status === "cancelled" ||
      r.status === "rejected" ||
      r.status === "pending");

  return (
    <div>
      <BackLink href="/requests" label="Back to requests" />
      <PageHeader
        title={`Request #${r.id} — ${r.type === "expense" ? "Expense Release" : "Liability Payment"}`}
        subtitle={`Submitted by ${r.requestedBy.displayName} on ${fmtDate(r.requestedAt?.slice(0, 10) ?? null)}`}
        actions={
          <>
            <span
              className={`badge badge-${STATUS_BADGES[r.status] ?? "warn"} text-base px-3 py-1.5`}
            >
              {r.status}
            </span>
            {r.status === "pending" && isOwner && (
              <>
                <Link
                  href={`/requests/${r.id}/edit`}
                  className="btn-secondary"
                >
                  Edit Request
                </Link>
                <CancelButton id={r.id} />
              </>
            )}
            {canDelete && <DeleteRequestButton id={r.id} />}
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <section className="card">
          <h3 className="font-bold mb-3">Request</h3>
          <Info label="Amount">
            <span className="text-lg font-bold text-[var(--brand-orange)]">
              {fmt(r.amount)}
            </span>
          </Info>
          <Info label="Needed By">{fmtDate(r.neededByDate)}</Info>
          <Info label="Type">
            {r.type === "expense" ? "Expense Release" : "Liability Payment"}
          </Info>
          {r.type === "expense" ? (
            <>
              <Info label="Category">{r.category?.name ?? "—"}</Info>
              <Info label="Account">{r.account?.name ?? "—"}</Info>
              <Info label="Linked Service">
                {r.service ? (
                  <Link
                    href={`/services/${r.service.id}`}
                    className="text-[var(--brand-blue)] hover:underline"
                  >
                    {r.service.client.deceasedFirstName}{" "}
                    {r.service.client.deceasedLastName}
                  </Link>
                ) : (
                  "—"
                )}
              </Info>
            </>
          ) : (
            <Info label="Liability">
              {r.liability ? (
                <Link
                  href={`/liabilities/${r.liability.id}`}
                  className="text-[var(--brand-blue)] hover:underline"
                >
                  {r.liability.name}
                </Link>
              ) : (
                "—"
              )}
            </Info>
          )}
          <Info label="Reference">{r.reference ?? "—"}</Info>
        </section>

        <section className="card">
          <h3 className="font-bold mb-3">Review</h3>
          {r.status === "pending" ? (
            <p className="text-sm text-[#4a5678]">Awaiting review by accounting.</p>
          ) : (
            <>
              <Info label="Status">
                <span
                  className={`badge badge-${STATUS_BADGES[r.status] ?? "warn"}`}
                >
                  {r.status}
                </span>
              </Info>
              {r.reviewer && (
                <Info label="Reviewed By">{r.reviewer.displayName}</Info>
              )}
              <Info label="Reviewed At">
                {fmtDate(r.reviewedAt?.slice(0, 10) ?? null)}
              </Info>
              {r.reviewNotes && (
                <div className="mt-2 pt-2 border-t border-[#e5ebf5]">
                  <div className="text-xs text-[#4a5678] font-semibold uppercase mb-1">
                    Notes
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.reviewNotes}</p>
                </div>
              )}
              {r.status === "released" && (
                <div className="mt-3 pt-3 border-t border-[#e5ebf5]">
                  <Info label="Released By">
                    {r.releasedBy?.displayName ?? "—"}
                  </Info>
                  <Info label="Released At">
                    {fmtDate(r.releasedAt?.slice(0, 10) ?? null)}
                  </Info>
                  {r.resultingExpenseId && (
                    <Info label="Expense Record">
                      <Link
                        href={`/expenses/${r.resultingExpenseId}/edit`}
                        className="text-[var(--brand-blue)] hover:underline"
                      >
                        #{r.resultingExpenseId}
                      </Link>
                    </Info>
                  )}
                  {r.resultingLiabilityPaymentId && r.liability && (
                    <Info label="Payment Recorded">
                      <Link
                        href={`/liabilities/${r.liability.id}/payments/${r.resultingLiabilityPaymentId}/edit`}
                        className="text-[var(--brand-blue)] hover:underline"
                      >
                        on {r.liability.name}
                      </Link>
                    </Info>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {(r.description || r.justification) && (
        <section className="card mb-4">
          <h3 className="font-bold mb-2">Details</h3>
          {r.description && (
            <div className="mb-3">
              <div className="text-xs text-[#4a5678] font-semibold uppercase">
                Description
              </div>
              <p className="text-sm">{r.description}</p>
            </div>
          )}
          {r.justification && (
            <div>
              <div className="text-xs text-[#4a5678] font-semibold uppercase">
                Justification
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.justification}</p>
            </div>
          )}
        </section>
      )}

      {attachments.length > 0 && (
        <section className="card mb-4">
          <h3 className="font-bold mb-3">
            Supporting Documents ({attachments.length})
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-blue)] hover:underline font-semibold"
                >
                  📎 {a.filename}
                </a>
                <span className="text-xs text-[#4a5678] ml-2">
                  {(a.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canReview && (r.status === "pending" || r.status === "approved") && (
        <section className="card no-print">
          <h3 className="font-bold mb-3">Accounting Actions</h3>
          <ReviewActions
            id={r.id}
            status={r.status}
            amount={r.amount}
            type={r.type}
          />
        </section>
      )}

      <CommentThread
        requestId={r.id}
        comments={comments.map((c) => ({
          id: c.id,
          message: c.message,
          createdAt: c.createdAt,
          user: {
            id: c.user.id,
            displayName: c.user.displayName,
            role: c.user.role,
          },
        }))}
        canComment={canComment}
        currentUserId={me.id}
        isAdmin={isAdmin}
      />
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
    <div className="flex py-1.5 border-b border-[#e5ebf5] last:border-0 text-sm">
      <div className="w-36 text-[#4a5678] shrink-0">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
