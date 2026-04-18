"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLiabilityPayment } from "@/app/(app)/liabilities/actions";
import AttachmentInput, {
  type AttachmentLite,
} from "@/components/AttachmentInput";

export default function EditPaymentForm({
  paymentId,
  liabilityId,
  initial,
  attachments,
}: {
  paymentId: number;
  liabilityId: number;
  initial: { date: string; amount: number; notes: string | null };
  attachments: AttachmentLite[];
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      encType="multipart/form-data"
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await updateLiabilityPayment(paymentId, fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          router.push(`/liabilities/${liabilityId}`);
        })
      }
      className="flex flex-col gap-4"
    >
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
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
          Notes
          <input
            name="notes"
            defaultValue={initial.notes ?? ""}
            className="input"
          />
        </label>

        <div className="md:col-span-3">
          <AttachmentInput
            existing={attachments}
            label="Receipts / Proof of Payment"
          />
        </div>
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
