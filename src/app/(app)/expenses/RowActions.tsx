"use client";
import Link from "next/link";
import { useTransition } from "react";
import { deleteExpense } from "./actions";

export default function RowActions({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2 items-center">
      <Link
        href={`/expenses/${id}/edit`}
        className="text-[var(--brand-blue)] hover:underline text-xs font-semibold"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("Delete this expense?")) return;
            const r = await deleteExpense(id);
            if (r?.error) alert(r.error);
          })
        }
        className="text-[#c0392b] hover:underline text-xs font-semibold"
      >
        {pending ? "…" : "Delete"}
      </button>
    </div>
  );
}
