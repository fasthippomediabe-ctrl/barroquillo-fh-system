"use client";
import { useTransition, useRef } from "react";
import { recordLiabilityPayment } from "../actions";

export default function LiabilityPaymentForm({
  liabilityId,
}: {
  liabilityId: number;
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          const res = await recordLiabilityPayment(liabilityId, fd);
          if (res?.error) {
            alert(res.error);
            return;
          }
          formRef.current?.reset();
        })
      }
      className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Date
        <input name="date" type="date" defaultValue={today} className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Amount (₱) *
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
        Notes
        <input name="notes" className="input" />
      </label>
      <button
        type="submit"
        className="btn-primary md:col-span-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Record Payment"}
      </button>
    </form>
  );
}
