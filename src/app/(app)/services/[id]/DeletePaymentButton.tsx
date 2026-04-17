"use client";
import { useTransition } from "react";
import { deletePayment } from "../actions";

export default function DeletePaymentButton({
  paymentId,
  serviceId,
}: {
  paymentId: number;
  serviceId: number;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-[#c0392b] hover:underline text-xs font-semibold"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (confirm("Delete this payment?"))
            await deletePayment(paymentId, serviceId);
        })
      }
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
