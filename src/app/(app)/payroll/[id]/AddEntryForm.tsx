"use client";
import { useState, useMemo, useTransition, useRef } from "react";
import { createEntry } from "../actions";
import {
  computeSss,
  computePhilHealth,
  computePagIbig,
  computeWht,
} from "@/lib/payroll";

type EmpOpt = {
  id: number;
  label: string;
  position: string | null;
  rateType: string;
  rateAmount: number;
  /** Total of embalmer fees on services (burial date in period) — for per_service employees. */
  perServiceFees?: number;
  /** Human-readable breakdown used as the default earnings note. */
  perServiceNote?: string;
};

export default function AddEntryForm({
  periodId,
  periodStart,
  periodEnd,
  employees,
}: {
  periodId: number;
  periodStart: string;
  periodEnd: string;
  employees: EmpOpt[];
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [empId, setEmpId] = useState<string>("");
  const [daysOrHours, setDaysOrHours] = useState<string>("");
  const [basicPay, setBasicPay] = useState<string>("0");
  const formRef = useRef<HTMLFormElement>(null);

  const selectedEmp = employees.find((e) => String(e.id) === empId);
  const isDaily = selectedEmp?.rateType === "daily";
  const isHourly = selectedEmp?.rateType === "hourly";
  const unitRate = selectedEmp?.rateAmount ?? 0;

  const onDaysOrHoursChange = (v: string) => {
    setDaysOrHours(v);
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && unitRate > 0) {
      setBasicPay((n * unitRate).toFixed(2));
    }
  };

  const periodDays =
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
      86400000 +
    1;
  const semi = periodDays <= 17;

  // When employee changes, reset the days/hours input and seed the basic
  // pay from the rate-aware seed computed below.
  // (useMemo runs BEFORE state changes fire, so we just wire onChange on the select
  //  to clear these fields.)
  const seed = useMemo(() => {
    const emp = employees.find((e) => String(e.id) === empId);
    if (!emp) return null;

    if (emp.rateType === "per_service") {
      return {
        basicPay: emp.perServiceFees ?? 0,
        sss: 0,
        philhealth: 0,
        pagibig: 0,
        tax: 0,
        hint: emp.perServiceNote ?? null,
      };
    }
    if (emp.rateType === "daily" || emp.rateType === "hourly") {
      return {
        basicPay: 0,
        sss: 0,
        philhealth: 0,
        pagibig: 0,
        tax: 0,
        hint: `Rate: ₱${emp.rateAmount.toFixed(2)} / ${emp.rateType}. Enter ${emp.rateType === "daily" ? "days" : "hours"} worked below to auto-compute basic pay.`,
      };
    }

    const monthly = emp.rateAmount;
    const sss = monthly > 0 ? computeSss(monthly) : 0;
    const philhealth = monthly > 0 ? computePhilHealth(monthly) : 0;
    const pagibig = monthly > 0 ? computePagIbig(monthly) : 0;
    const tax = monthly > 0 ? computeWht(monthly, sss, philhealth, pagibig) : 0;
    const basicPay = monthly > 0 ? (semi ? monthly / 2 : monthly) : 0;
    const scale = semi ? 0.5 : 1;
    return {
      basicPay,
      sss: +(sss * scale).toFixed(2),
      philhealth: +(philhealth * scale).toFixed(2),
      pagibig: +(pagibig * scale).toFixed(2),
      tax: +(tax * scale).toFixed(2),
      hint: null as string | null,
    };
  }, [empId, employees, semi]);

  return (
    <form
      ref={formRef}
      key={empId}
      action={(fd) =>
        start(async () => {
          setErr(null);
          if (!empId) {
            setErr("Select an employee.");
            return;
          }
          const res = await createEntry(periodId, Number(empId), fd);
          if (res?.error) {
            setErr(res.error);
            return;
          }
          formRef.current?.reset();
          setEmpId("");
        })
      }
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Employee
          <select
            value={empId}
            onChange={(e) => {
              setEmpId(e.target.value);
              setDaysOrHours("");
              const emp = employees.find(
                (x) => String(x.id) === e.target.value,
              );
              // reset basic pay to the seed for this employee
              if (emp?.rateType === "monthly") {
                const monthly = emp.rateAmount;
                const bp = monthly > 0 ? (semi ? monthly / 2 : monthly) : 0;
                setBasicPay(bp.toFixed(2));
              } else if (emp?.rateType === "per_service") {
                setBasicPay((emp.perServiceFees ?? 0).toFixed(2));
              } else {
                setBasicPay("0");
              }
            }}
            className="select"
          >
            <option value="">— Select —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.position ? ` (${e.position})` : ""} · {e.rateType}
              </option>
            ))}
          </select>
          {seed?.hint && (
            <span className="text-xs font-normal text-[var(--brand-blue)]">
              {seed.hint}
            </span>
          )}
        </label>
        {(isDaily || isHourly) && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {isDaily ? "Days Worked" : "Hours Worked"}
            <input
              type="number"
              step={isHourly ? "0.25" : "0.5"}
              min="0"
              value={daysOrHours}
              onChange={(e) => onDaysOrHoursChange(e.target.value)}
              className="input"
              placeholder={isDaily ? "e.g., 13" : "e.g., 104"}
            />
            <span className="text-xs font-normal text-[#4a5678]">
              Rate ₱{unitRate.toFixed(2)} / {isDaily ? "day" : "hour"}
            </span>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Basic Pay
          <input
            name="basicPay"
            type="number"
            step="0.01"
            value={basicPay}
            onChange={(e) => setBasicPay(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Overtime
          <input
            name="overtimePay"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Holiday
          <input
            name="holidayPay"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Bonus
          <input
            name="bonus"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Other Earnings
          <div className="grid grid-cols-2 gap-2">
            <input
              name="otherEarnings"
              type="number"
              step="0.01"
              defaultValue="0"
              className="input"
            />
            <input
              name="otherEarningsNote"
              placeholder="Note"
              className="input"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          SSS
          <input
            name="sss"
            type="number"
            step="0.01"
            defaultValue={seed?.sss ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          PhilHealth
          <input
            name="philhealth"
            type="number"
            step="0.01"
            defaultValue={seed?.philhealth ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Pag-IBIG
          <input
            name="pagibig"
            type="number"
            step="0.01"
            defaultValue={seed?.pagibig ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Tax
          <input
            name="tax"
            type="number"
            step="0.01"
            defaultValue={seed?.tax ?? 0}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Cash Advance
          <input
            name="cashAdvance"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Absences
          <input
            name="absences"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Late/Tardy
          <input
            name="lateDeductions"
            type="number"
            step="0.01"
            defaultValue="0"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Other Deductions
          <div className="grid grid-cols-2 gap-2">
            <input
              name="otherDeductions"
              type="number"
              step="0.01"
              defaultValue="0"
              className="input"
            />
            <input
              name="otherDeductionsNote"
              placeholder="Note"
              className="input"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Paid Via
          <input name="paidVia" placeholder="e.g., GCash" className="input" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold mt-6">
          <input type="checkbox" name="isPaid" value="1" />
          Already paid
        </label>
      </div>

      {err && (
        <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={pending || !empId} className="btn-primary">
          {pending ? "Adding…" : "Add Entry"}
        </button>
      </div>
    </form>
  );
}
