"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AttachmentInput, {
  type AttachmentLite,
} from "@/components/AttachmentInput";
import { updateRequest } from "../../actions";

type Opt = { id: number; name?: string; label?: string };
type LiabilityOpt = {
  id: number;
  label: string;
  remainingBalance: number;
};

export default function EditRequestForm({
  requestId,
  type,
  initial,
  categories,
  accounts,
  services,
  liabilities,
  attachments,
}: {
  requestId: number;
  type: "expense" | "liability_payment";
  initial: {
    amount: number;
    description: string | null;
    justification: string | null;
    neededByDate: string | null;
    categoryId: number | null;
    accountId: number | null;
    serviceId: number | null;
    liabilityId: number | null;
    reference: string | null;
  };
  categories: Opt[];
  accounts: Opt[];
  services: Opt[];
  liabilities: LiabilityOpt[];
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
          const res = await updateRequest(requestId, fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          router.push(`/requests/${requestId}`);
        })
      }
      className="flex flex-col gap-4"
    >
      <section className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Amount (₱) *
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={initial.amount}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Needed By Date
          <input
            name="neededByDate"
            type="date"
            defaultValue={initial.neededByDate ?? ""}
            className="input"
          />
        </label>

        {type === "expense" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Category
              <select
                name="categoryId"
                defaultValue={initial.categoryId ?? ""}
                className="select"
              >
                <option value="">— Uncategorized —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Pay From / Account
              <select
                name="accountId"
                defaultValue={initial.accountId ?? ""}
                className="select"
              >
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
              Linked Service
              <select
                name="serviceId"
                defaultValue={initial.serviceId ?? ""}
                className="select"
              >
                <option value="">— None —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Liability to Pay *
            <select
              name="liabilityId"
              defaultValue={initial.liabilityId ?? ""}
              required
              className="select"
            >
              <option value="">— Pick a liability —</option>
              {liabilities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Description
          <input
            name="description"
            defaultValue={initial.description ?? ""}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Reason / Justification
          <textarea
            name="justification"
            rows={2}
            defaultValue={initial.justification ?? ""}
            className="textarea"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Reference #
          <input
            name="reference"
            defaultValue={initial.reference ?? ""}
            className="input"
          />
        </label>

        <div className="md:col-span-2">
          <AttachmentInput
            existing={attachments}
            label="Supporting Documents"
            hint="Add new files or remove existing ones."
          />
        </div>
      </section>

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
