"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEntry } from "@/app/(app)/payroll/actions";

type Initial = {
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  bonus: number;
  otherEarnings: number;
  otherEarningsNote: string | null;
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  cashAdvance: number;
  absences: number;
  lateDeductions: number;
  otherDeductions: number;
  otherDeductionsNote: string | null;
  paidVia: string | null;
  isPaid: number;
  notes: string | null;
};

export default function EntryEditForm({
  entryId,
  initial,
}: {
  entryId: number;
  initial: Initial;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await updateEntry(entryId, fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          router.back();
        })
      }
      className="flex flex-col gap-4"
    >
      <section className="card">
        <h3 className="font-bold mb-3">Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumField name="basicPay" label="Basic Pay" value={initial.basicPay} />
          <NumField name="overtimePay" label="Overtime" value={initial.overtimePay} />
          <NumField name="holidayPay" label="Holiday" value={initial.holidayPay} />
          <NumField name="bonus" label="Bonus" value={initial.bonus} />
          <NumField name="otherEarnings" label="Other" value={initial.otherEarnings} />
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-3">
            Other Earnings Note
            <input
              name="otherEarningsNote"
              defaultValue={initial.otherEarningsNote ?? ""}
              className="input"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Deductions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NumField name="sss" label="SSS" value={initial.sss} />
          <NumField name="philhealth" label="PhilHealth" value={initial.philhealth} />
          <NumField name="pagibig" label="Pag-IBIG" value={initial.pagibig} />
          <NumField name="tax" label="Tax" value={initial.tax} />
          <NumField name="cashAdvance" label="Cash Advance" value={initial.cashAdvance} />
          <NumField name="absences" label="Absences" value={initial.absences} />
          <NumField name="lateDeductions" label="Late/Tardy" value={initial.lateDeductions} />
          <NumField name="otherDeductions" label="Other" value={initial.otherDeductions} />
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-4">
            Other Deductions Note
            <input
              name="otherDeductionsNote"
              defaultValue={initial.otherDeductionsNote ?? ""}
              className="input"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Paid Via
            <input
              name="paidVia"
              defaultValue={initial.paidVia ?? ""}
              className="input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold mt-6">
            <input
              type="checkbox"
              name="isPaid"
              value="1"
              defaultChecked={initial.isPaid === 1}
            />
            Already paid
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-3">
            Notes
            <textarea
              name="notes"
              rows={2}
              defaultValue={initial.notes ?? ""}
              className="textarea"
            />
          </label>
        </div>
      </section>

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
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function NumField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={value}
        className="input"
      />
    </label>
  );
}
