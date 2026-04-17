"use client";
import { useTransition } from "react";
import { deleteLiabilityPayment } from "../actions";

export default function DeletePaymentButton({
  paymentId,
  liabilityId,
}: {
  paymentId: number;
  liabilityId: number;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Delete this payment? Balance will be restored.")) return;
          const r = await deleteLiabilityPayment(paymentId, liabilityId);
          if (r?.error) alert(r.error);
        })
      }
      className="text-[#c0392b] hover:underline text-xs font-semibold"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
