"use client";
import { useState, useMemo } from "react";
import {
  computeSss,
  computePhilHealth,
  computePagIbig,
  computeWht,
  compute13th,
} from "@/lib/payroll";

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayrollCalculator() {
  const [salary, setSalary] = useState(20000);
  const [monthsWorked, setMonthsWorked] = useState(12);
  const r = useMemo(() => {
    const sss = computeSss(salary);
    const ph = computePhilHealth(salary);
    const pi = computePagIbig(salary);
    const wht = computeWht(salary, sss, ph, pi);
    const net = salary - sss - ph - pi - wht;
    const thirteenth = compute13th(salary * monthsWorked, monthsWorked);
    return { sss, ph, pi, wht, net, thirteenth };
  }, [salary, monthsWorked]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-bold mb-4">Input</h3>
        <label className="flex flex-col gap-1 text-sm font-semibold mb-3">
          Monthly Basic Salary (₱)
          <input
            type="number"
            min={0}
            step={100}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value) || 0)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Months Worked (for 13th month)
          <input
            type="number"
            min={1}
            max={12}
            value={monthsWorked}
            onChange={(e) => setMonthsWorked(Number(e.target.value) || 0)}
            className="input"
          />
        </label>
      </div>
      <div className="card">
        <h3 className="font-bold mb-4">Breakdown</h3>
        <Row label="SSS (employee share)" value={r.sss} />
        <Row label="PhilHealth (employee share)" value={r.ph} />
        <Row label="Pag-IBIG (employee share)" value={r.pi} />
        <Row label="Withholding Tax" value={r.wht} />
        <Row label="Total Deductions" value={r.sss + r.ph + r.pi + r.wht} bold />
        <Row label="Net Take-Home" value={r.net} bold accent />
        <hr className="my-3 border-[#e5ebf5]" />
        <Row label={`13th Month (over ${monthsWorked} months)`} value={r.thirteenth} bold />
      </div>
      <div className="card lg:col-span-2 text-xs text-[#4a5678]">
        Tables use 2024 BIR TRAIN brackets, 2024 SSS table, 5% PhilHealth (capped ₱100K MSC,
        split 50/50), Pag-IBIG (2% up to ₱5K MFC cap for both employee and employer).
        Adjust constants in <code>src/lib/payroll.ts</code> when schedules change.
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1.5 border-b border-[#e5ebf5] last:border-0 text-sm ${
        bold ? "font-bold" : ""
      } ${accent ? "text-[var(--brand-orange)]" : ""}`}
    >
      <span>{label}</span>
      <span>{peso(value)}</span>
    </div>
  );
}
