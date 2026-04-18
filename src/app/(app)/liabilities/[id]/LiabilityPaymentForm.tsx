"use client";
import { useTransition, useRef, useState } from "react";
import { recordLiabilityPayment } from "../actions";
import AttachmentInput from "@/components/AttachmentInput";

export default function LiabilityPaymentForm({
  liabilityId,
}: {
  liabilityId: number;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      encType="multipart/form-data"
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await recordLiabilityPayment(liabilityId, fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          formRef.current?.reset();
        })
      }
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date
          <input
            name="date"
            type="date"
            defaultValue={today}
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
            required
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Notes
          <input name="notes" className="input" />
        </label>
      </div>

      <AttachmentInput
        existing={[]}
        label="Receipts / Proof of Payment"
        hint="Attach one or more receipts. JPG, PNG, WebP, HEIC, or PDF — up to 4 MB each."
      />

      {err && (
        <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
