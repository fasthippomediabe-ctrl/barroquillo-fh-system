"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CategoryOpt = { id: number; name: string };
type AccountOpt = { id: number; name: string };
type ServiceOpt = { id: number; label: string };

type Initial = {
  date?: string;
  amount?: number;
  categoryId?: number | null;
  accountId?: number | null;
  serviceId?: number | null;
  description?: string | null;
  reference?: string | null;
  receiptUrl?: string | null;
  receiptFilename?: string | null;
};

export default function ExpenseForm({
  action,
  initial,
  categories,
  accounts,
  services,
  submitLabel = "Save",
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: Initial;
  categories: CategoryOpt[];
  accounts: AccountOpt[];
  services: ServiceOpt[];
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [catId, setCatId] = useState<string>(
    initial?.categoryId != null ? String(initial.categoryId) : "",
  );
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

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
      encType="multipart/form-data"
    >
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date *
          <input
            name="date"
            type="date"
            defaultValue={initial?.date ?? today}
            required
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
            defaultValue={initial?.amount ?? ""}
            required
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Category
          <select
            name="categoryId"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="select"
          >
            <option value="">— Uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Add new category…</option>
          </select>
        </label>
        {catId === "__new__" && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            New Category Name *
            <input
              name="newCategoryName"
              className="input"
              placeholder="e.g., Vehicle Maintenance"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Account / Source
          <select
            name="accountId"
            defaultValue={
              initial?.accountId != null ? String(initial.accountId) : ""
            }
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

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Linked Service
          <select
            name="serviceId"
            defaultValue={
              initial?.serviceId != null ? String(initial.serviceId) : ""
            }
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

        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Description
          <input
            name="description"
            defaultValue={initial?.description ?? ""}
            className="input"
            placeholder="e.g., Casket purchase from ABC Supplier"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Reference # (invoice, OR, etc.)
          <input
            name="reference"
            defaultValue={initial?.reference ?? ""}
            className="input"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          <span>Receipt (JPG, PNG, PDF — max 4 MB)</span>
          {initial?.receiptUrl && (
            <div className="flex items-center gap-3 bg-[var(--brand-bg-alt)] rounded-lg p-2 text-sm">
              <a
                href={initial.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-blue)] hover:underline font-semibold"
              >
                📎 {initial.receiptFilename ?? "Current receipt"}
              </a>
              <label className="ml-auto flex items-center gap-1 text-xs font-normal text-[#c0392b]">
                <input
                  type="checkbox"
                  name="removeReceipt"
                  value="1"
                />
                Remove on save
              </label>
            </div>
          )}
          <input
            type="file"
            name="receipt"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            className="input !py-1.5"
          />
          {initial?.receiptUrl && (
            <span className="text-xs text-[#4a5678] font-normal">
              Picking a new file replaces the existing one.
            </span>
          )}
        </div>
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
