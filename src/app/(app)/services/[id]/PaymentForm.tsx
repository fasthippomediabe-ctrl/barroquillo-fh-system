"use client";
import { useTransition, useRef } from "react";
import { recordPayment } from "../actions";

export default function PaymentForm({ serviceId }: { serviceId: number }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await recordPayment(serviceId, fd);
          formRef.current?.reset();
        })
      }
      className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
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
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Method
        <select name="method" defaultValue="cash" className="select">
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Reference #
        <input name="reference" className="input" />
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Record Payment"}
      </button>
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-5">
        Notes
        <input name="notes" className="input" />
      </label>
    </form>
  );
}
