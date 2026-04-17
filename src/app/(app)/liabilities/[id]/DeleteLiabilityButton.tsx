"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLiability } from "../actions";

export default function DeleteLiabilityButton({
  id,
  hasPayments,
}: {
  id: number;
  hasPayments: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const prompt = hasPayments
          ? "Delete this liability and all its payment history? Cannot be undone."
          : "Delete this liability?";
        if (!confirm(prompt)) return;
        start(async () => {
          const r = await deleteLiability(id);
          if (r?.error) {
            alert(r.error);
            return;
          }
          router.push("/liabilities");
        });
      }}
      className="btn-danger"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
