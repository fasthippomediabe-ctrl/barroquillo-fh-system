"use client";
import Link from "next/link";
import { useTransition } from "react";
import { deleteEntry, toggleEntryPaid } from "../actions";

export default function EntryRowActions({
  entryId,
  periodId,
  isPaid,
}: {
  entryId: number;
  periodId: number;
  isPaid: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Link
        href={`/payroll/${periodId}/entries/${entryId}/payslip`}
        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
      >
        Payslip
      </Link>
      <Link
        href={`/payroll/${periodId}/entries/${entryId}/edit`}
        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        className="text-[#4a5678] hover:text-[var(--brand-navy)] text-xs font-semibold"
        onClick={() =>
          start(async () => {
            const r = await toggleEntryPaid(entryId);
            if (r?.error) alert(r.error);
          })
        }
      >
        {isPaid ? "Unmark paid" : "Mark paid"}
      </button>
      <button
        type="button"
        disabled={pending}
        className="text-[#c0392b] hover:underline text-xs font-semibold"
        onClick={() =>
          start(async () => {
            if (!confirm("Delete this entry?")) return;
            const r = await deleteEntry(entryId);
            if (r?.error) alert(r.error);
          })
        }
      >
        Delete
      </button>
    </div>
  );
}
