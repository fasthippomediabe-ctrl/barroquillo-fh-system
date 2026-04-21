"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AttachmentInput from "@/components/AttachmentInput";

type Opt = { id: number; name?: string; label?: string };
type LiabilityOpt = {
  id: number;
  label: string;
  remainingBalance: number;
  monthlyPayment: number;
};

export default function NewRequestForm({
  action,
  initialType,
  categories,
  accounts,
  services,
  liabilities,
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initialType: "expense" | "liability_payment";
  categories: Opt[];
  accounts: Opt[];
  services: Opt[];
  liabilities: LiabilityOpt[];
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [type, setType] =
    useState<"expense" | "liability_payment">(initialType);
  const [selectedLiab, setSelectedLiab] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const router = useRouter();

  const liab = liabilities.find((l) => String(l.id) === selectedLiab);

  return (
    <form
      encType="multipart/form-data"
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await action(fd);
          if (res && "error" in res && res.error) setErr(res.error);
        })
      }
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="type" value={type} />

      <section className="card">
        <h3 className="font-bold mb-3">What is this for?</h3>
        <div className="flex gap-3 flex-wrap">
          {(
            [
              {
                k: "expense",
                label: "Expense Release",
                hint: "Request money to pay for a purchase (supplies, transport, repair, etc.)",
              },
              {
                k: "liability_payment",
                label: "Liability Payment",
                hint: "Request to pay down a loan / credit / supplier balance",
              },
            ] as const
          ).map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => setType(o.k)}
              className={`flex-1 min-w-[260px] text-left p-4 rounded-lg border-2 transition ${
                type === o.k
                  ? "border-[var(--brand-orange)] bg-[var(--brand-bg-alt)]"
                  : "border-[#d6dcec] bg-white"
              }`}
            >
              <div className="font-semibold text-[var(--brand-navy)]">
                {o.label}
              </div>
              <div className="text-xs text-[#4a5678] mt-1">{o.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Amount (₱) *
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Needed By Date
          <input name="neededByDate" type="date" className="input" />
          <span className="text-xs font-normal text-[#4a5678]">
            When do you need the money released? (optional)
          </span>
        </label>

        {type === "expense" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Category
              <select name="categoryId" defaultValue="" className="select">
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
              <select name="accountId" defaultValue="" className="select">
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
              Linked Service (if for a specific service)
              <select name="serviceId" defaultValue="" className="select">
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
              value={selectedLiab}
              onChange={(e) => setSelectedLiab(e.target.value)}
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
            {liab && (
              <span className="text-xs font-normal text-[var(--brand-blue)]">
                Remaining: ₱{liab.remainingBalance.toLocaleString("en-PH")}
                {liab.monthlyPayment > 0
                  ? ` · Monthly: ₱${liab.monthlyPayment.toLocaleString("en-PH")}`
                  : ""}
              </span>
            )}
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          {type === "expense"
            ? "What is it for? (Description)"
            : "Notes (optional)"}
          <input
            name="description"
            className="input"
            placeholder={
              type === "expense"
                ? "e.g., Fuel for transport to Cotabato"
                : "e.g., March installment"
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Reason / Justification
          <textarea
            name="justification"
            rows={2}
            className="textarea"
            placeholder="Why is this needed now?"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Reference #
          <input name="reference" className="input" placeholder="invoice/OR/etc." />
        </label>

        <div className="md:col-span-2">
          <AttachmentInput
            existing={[]}
            label="Supporting Documents (quotations, invoices, photos)"
            hint="Attach one or more files. JPG, PNG, WebP, HEIC, or PDF — up to 4 MB each."
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
          {pending ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
