// Philippine statutory payroll computations.
// Values reflect the tables used in the original Streamlit app (2024 brackets).

export function computeSss(salary: number): number {
  // Simplified 2024 SSS table — employee share 4.5% of MSC, min ₱4000 MSC, max ₱30000 MSC.
  const msc = Math.min(30000, Math.max(4000, Math.round(salary / 500) * 500));
  return +(msc * 0.045).toFixed(2);
}

export function computePhilHealth(salary: number): number {
  // 2024: 5% of monthly basic, split 50/50, floor ₱500, ceiling ₱5000 total → ₱2500 employee.
  const rate = 0.05;
  const base = Math.min(100000, Math.max(10000, salary));
  const total = base * rate;
  return +(total / 2).toFixed(2);
}

export function computePagIbig(salary: number): number {
  // 2% of MFC, cap MFC at ₱5000 → ₱100 employee.
  const mfc = Math.min(5000, salary);
  return +(mfc * 0.02).toFixed(2);
}

export function computeWht(
  salary: number,
  sss: number,
  philHealth: number,
  pagIbig: number,
): number {
  // 2023+ TRAIN monthly withholding tax brackets on taxable income.
  const taxable = Math.max(0, salary - sss - philHealth - pagIbig);
  let tax = 0;
  if (taxable <= 20833) tax = 0;
  else if (taxable <= 33332) tax = (taxable - 20833) * 0.15;
  else if (taxable <= 66666) tax = 1875 + (taxable - 33333) * 0.2;
  else if (taxable <= 166666) tax = 8541.8 + (taxable - 66667) * 0.25;
  else if (taxable <= 666666) tax = 33541.8 + (taxable - 166667) * 0.3;
  else tax = 183541.8 + (taxable - 666667) * 0.35;
  return +tax.toFixed(2);
}

export function compute13th(totalBasicEarned: number, monthsWorked = 12): number {
  // 13th month = 1/12 of total basic salary earned during the year.
  if (monthsWorked <= 0) return 0;
  return +(totalBasicEarned / 12).toFixed(2);
}
