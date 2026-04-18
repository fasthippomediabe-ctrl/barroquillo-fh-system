"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  name?: string;
  type?: string;
  creditor?: string | null;
  principalAmount?: number;
  remainingBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  dueDate?: string | null;
  loanDate?: string | null;
  status?: string;
  notes?: string | null;
};

const TYPES = ["loan", "credit_card", "supplier_credit", "mortgage", "other"];
const STATUSES = ["active", "paid", "defaulted", "restructured"];

export default function LiabilityForm({
  action,
  initial,
  submitLabel = "Save",
  isNew = false,
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: Initial;
  submitLabel?: string;
  isNew?: boolean;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await action(fd);
          if (res?.error) setErr(res.error);
        })
      }
      className="flex flex-col gap-4"
    >
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Name *
          <input
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            className="input"
            placeholder="e.g., BPI Business Loan 2024"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Type
          <select name="type" defaultValue={initial?.type ?? "loan"} className="select">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Creditor
          <input
            name="creditor"
            defaultValue={initial?.creditor ?? ""}
            className="input"
            placeholder="e.g., BPI Family Bank"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Principal Amount (₱) *
          <input
            name="principalAmount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={initial?.principalAmount ?? ""}
            required
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Remaining Balance (₱)
          <input
            name="remainingBalance"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              initial?.remainingBalance ?? initial?.principalAmount ?? ""
            }
            className="input"
            placeholder={isNew ? "Defaults to principal" : undefined}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Interest Rate (%)
          <input
            name="interestRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.interestRate ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Monthly Payment (₱)
          <input
            name="monthlyPayment"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.monthlyPayment ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Loan / Cash-Received Date
          <input
            name="loanDate"
            type="date"
            defaultValue={initial?.loanDate ?? ""}
            className="input"
          />
          <span className="text-xs font-normal text-[#4a5678]">
            When you actually received the money. Set this to the past for
            legacy loans (e.g., the 2024 chapel-build loan) so they don&apos;t
            show up as funding received this month.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Due Date
          <input
            name="dueDate"
            type="date"
            defaultValue={initial?.dueDate ?? ""}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Status
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="select"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className="textarea"
          />
        </label>
      </div>

      {err && (
        <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
