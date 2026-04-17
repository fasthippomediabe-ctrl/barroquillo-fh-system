"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  periodName?: string;
  startDate?: string;
  endDate?: string;
  payDate?: string | null;
  status?: string;
  notes?: string | null;
};

export default function PeriodForm({
  action,
  initial,
  submitLabel = "Save",
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
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
    >
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Period Name *
          <input
            name="periodName"
            required
            defaultValue={initial?.periodName ?? ""}
            className="input"
            placeholder='e.g., "Nov 1-15, 2026"'
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Start Date *
          <input
            type="date"
            name="startDate"
            required
            defaultValue={initial?.startDate ?? today}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          End Date *
          <input
            type="date"
            name="endDate"
            required
            defaultValue={initial?.endDate ?? today}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Pay Date
          <input
            type="date"
            name="payDate"
            defaultValue={initial?.payDate ?? ""}
            className="input"
          />
        </label>
        {initial && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Status
            <select
              name="status"
              defaultValue={initial?.status ?? "draft"}
              className="select"
            >
              <option value="draft">draft</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Notes
          <input
            name="notes"
            defaultValue={initial?.notes ?? ""}
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
