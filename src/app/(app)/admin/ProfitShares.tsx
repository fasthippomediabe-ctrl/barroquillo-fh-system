"use client";
import { useState, useTransition, useRef } from "react";
import {
  createProfitShare,
  updateProfitShare,
  deleteProfitShare,
  toggleProfitShareActive,
} from "./profitShareActions";

type Share = {
  id: number;
  name: string;
  percent: number;
  bankInfo: string | null;
  notes: string | null;
  isActive: number;
};

export default function ProfitShares({ shares }: { shares: Share[] }) {
  const activeTotal = shares
    .filter((s) => s.isActive === 1)
    .reduce((a, s) => a + s.percent, 0);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          Active total: <strong>{activeTotal.toFixed(2)}%</strong>
          {Math.abs(activeTotal - 100) > 0.01 && (
            <span className="ml-2 text-[#c0392b]">
              ⚠ should equal 100%
            </span>
          )}
        </div>
        {!adding && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAdding(true)}
          >
            + Add Share
          </button>
        )}
      </div>

      {adding && (
        <ShareForm
          onCancel={() => setAdding(false)}
          onSubmit={async (fd) => {
            const res = await createProfitShare(fd);
            if (!res.error) setAdding(false);
            return res;
          }}
        />
      )}

      <div className="flex flex-col gap-3 mt-4">
        {shares.map((s) =>
          editing === s.id ? (
            <ShareForm
              key={s.id}
              initial={s}
              onCancel={() => setEditing(null)}
              onSubmit={async (fd) => {
                const res = await updateProfitShare(s.id, fd);
                if (!res.error) setEditing(null);
                return res;
              }}
            />
          ) : (
            <ShareRow
              key={s.id}
              share={s}
              onEdit={() => setEditing(s.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ShareRow({ share, onEdit }: { share: Share; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div
      className={`flex items-center justify-between bg-[var(--brand-bg-alt)] rounded-lg px-4 py-3 ${
        share.isActive === 0 ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="font-bold text-[var(--brand-orange)] text-lg w-20">
          {share.percent}%
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            {share.name}
            {share.isActive === 0 && (
              <span className="ml-2 badge badge-cancelled">inactive</span>
            )}
          </div>
          {share.bankInfo && (
            <div className="text-xs text-[#4a5678]">🏦 {share.bankInfo}</div>
          )}
          {share.notes && (
            <div className="text-xs text-[#4a5678] italic">{share.notes}</div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary !py-1 !px-3 !text-xs"
          onClick={onEdit}
          disabled={pending}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn-secondary !py-1 !px-3 !text-xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await toggleProfitShareActive(share.id);
              if (r?.error) alert(r.error);
            })
          }
        >
          {share.isActive === 1 ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          className="btn-danger !py-1 !px-3 !text-xs"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete share "${share.name}"?`)) return;
            start(async () => {
              const r = await deleteProfitShare(share.id);
              if (r?.error) alert(r.error);
            });
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ShareForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Share;
  onSubmit: (fd: FormData) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          setErr(null);
          const r = await onSubmit(fd);
          if (r?.error) setErr(r.error);
        })
      }
      className="bg-white border border-[var(--brand-orange)] rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
        Name *
        <input
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Percent *
        <input
          name="percent"
          type="number"
          step="0.01"
          min="0.01"
          max="100"
          required
          defaultValue={initial?.percent ?? ""}
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-1">
        Bank / Payout Info
        <input
          name="bankInfo"
          defaultValue={initial?.bankInfo ?? ""}
          className="input"
          placeholder="e.g., Triple J Bank Account"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-4">
        Notes
        <input
          name="notes"
          defaultValue={initial?.notes ?? ""}
          className="input"
        />
      </label>
      {err && (
        <div className="md:col-span-4 text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}
      <div className="md:col-span-4 flex justify-end gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}
