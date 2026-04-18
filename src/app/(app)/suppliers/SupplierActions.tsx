"use client";
import { useTransition } from "react";
import Link from "next/link";
import { toggleSupplierActive, deleteSupplier } from "./actions";

export default function SupplierActions({
  id,
  isActive,
}: {
  id: number;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2 items-center">
      <Link
        href={`/suppliers/${id}/edit`}
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
            const r = await toggleSupplierActive(id);
            if (r?.error) alert(r.error);
          })
        }
      >
        {isActive ? "Disable" : "Enable"}
      </button>
      <button
        type="button"
        disabled={pending}
        className="text-[#c0392b] hover:underline text-xs font-semibold"
        onClick={() =>
          start(async () => {
            if (!confirm("Delete this supplier?")) return;
            const r = await deleteSupplier(id);
            if (r?.error) alert(r.error);
          })
        }
      >
        Delete
      </button>
    </div>
  );
}
