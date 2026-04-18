"use client";
import { useState, useTransition } from "react";
import { generateCutoffsForMonth } from "./actions";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GenerateCutoffsButton() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setOpen(true)}
      >
        Generate Cutoffs
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-2">
              Auto-Generate Payroll Cutoffs
            </h3>
            <p className="text-sm text-[#4a5678] mb-4">
              Creates two pay periods for the selected month:
              <br />• <strong>1–15</strong> (pay date: the 15th)
              <br />• <strong>16–end of month</strong> (pay date: last day)
              <br />
              Already-existing periods are skipped.
            </p>
            <label className="flex flex-col gap-1 text-sm font-semibold mb-4">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await generateCutoffsForMonth(month);
                    if (res.error) {
                      alert(res.error);
                      return;
                    }
                    alert(
                      `Created ${res.created ?? 0} period${(res.created ?? 0) === 1 ? "" : "s"}. Skipped ${res.skipped ?? 0} (already existed).`,
                    );
                    setOpen(false);
                  })
                }
              >
                {pending ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
