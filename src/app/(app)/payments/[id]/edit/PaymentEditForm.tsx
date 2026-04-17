"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePayment } from "@/app/(app)/services/actions";

export default function PaymentEditForm({
  paymentId,
  serviceId,
  initial,
}: {
  paymentId: number;
  serviceId: number;
  initial: {
    date: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
  };
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await updatePayment(paymentId, fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          router.push(`/services/${serviceId}`);
        })
      }
      className="card flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date
          <input
            name="date"
            type="date"
            defaultValue={initial.date}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Amount (₱) *
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={initial.amount}
            required
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Method
          <select
            name="method"
            defaultValue={initial.method}
            className="select"
          >
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
          <input
            name="reference"
            defaultValue={initial.reference ?? ""}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Notes
          <input
            name="notes"
            defaultValue={initial.notes ?? ""}
            className="input"
          />
        </label>
      </div>

      {err && (
        <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
