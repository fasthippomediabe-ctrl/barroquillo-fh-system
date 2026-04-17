"use client";
import { useTransition } from "react";
import { bulkCreateEntries } from "../actions";

export default function BulkAddButton({
  periodId,
  missingCount,
}: {
  periodId: number;
  missingCount: number;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Create entries for all ${missingCount} active employees without one yet?`,
          )
        )
          return;
        start(async () => {
          const res = await bulkCreateEntries(periodId);
          if (res?.error) {
            alert(res.error);
            return;
          }
          alert(`Added ${res.created ?? 0} entr${(res.created ?? 0) === 1 ? "y" : "ies"}.`);
        });
      }}
    >
      {pending ? "Adding…" : `Add all ${missingCount} missing`}
    </button>
  );
}
