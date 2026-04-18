"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  computeSss,
  computePhilHealth,
  computePagIbig,
  computeWht,
} from "@/lib/payroll";

async function checkRole(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager", "hr"].includes(role))
    return { ok: false, error: "Only admins, managers, and HR can manage payroll." };
  return { ok: true };
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function req(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  if (x === "") return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function totals(e: {
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  bonus: number;
  otherEarnings: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  cashAdvance: number;
  absences: number;
  lateDeductions: number;
  otherDeductions: number;
}) {
  const grossPay =
    e.basicPay + e.overtimePay + e.holidayPay + e.bonus + e.otherEarnings;
  const totalDeductions =
    e.sss +
    e.philhealth +
    e.pagibig +
    e.tax +
    e.cashAdvance +
    e.absences +
    e.lateDeductions +
    e.otherDeductions;
  const netPay = grossPay - totalDeductions;
  return { grossPay, totalDeductions, netPay };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Auto-create the 1-15 and 16-end periods for a given YYYY-MM (idempotent). */
export async function generateCutoffsForMonth(
  yyyymm: string,
): Promise<{ error?: string; created?: number; skipped?: number }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return { error: "Use YYYY-MM format." };
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return { error: "Invalid month." };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
  });
  const lastDay = lastDayOfMonth(year, month);
  const mm = String(month).padStart(2, "0");
  const first = {
    periodName: `${monthLabel} · 1–15`,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-15`,
    payDate: `${year}-${mm}-15`,
  };
  const second = {
    periodName: `${monthLabel} · 16–${lastDay}`,
    startDate: `${year}-${mm}-16`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    payDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };

  const existing = await prisma.payrollPeriod.findMany({
    where: {
      OR: [
        { AND: [{ startDate: first.startDate }, { endDate: first.endDate }] },
        { AND: [{ startDate: second.startDate }, { endDate: second.endDate }] },
      ],
    },
  });
  const haveFirst = existing.some(
    (p) => p.startDate === first.startDate && p.endDate === first.endDate,
  );
  const haveSecond = existing.some(
    (p) => p.startDate === second.startDate && p.endDate === second.endDate,
  );

  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;
  if (!haveFirst) {
    await prisma.payrollPeriod.create({
      data: { ...first, status: "draft", createdAt: now },
    });
    created += 1;
  } else skipped += 1;
  if (!haveSecond) {
    await prisma.payrollPeriod.create({
      data: { ...second, status: "draft", createdAt: now },
    });
    created += 1;
  } else skipped += 1;

  revalidatePath("/payroll");
  return { created, skipped };
}

export async function createPeriod(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const periodName = req(formData.get("periodName"));
  const startDate = req(formData.get("startDate"));
  const endDate = req(formData.get("endDate"));
  if (!periodName || !startDate || !endDate)
    return { error: "Name, start date, and end date are required." };
  if (endDate < startDate)
    return { error: "End date must be on/after start date." };

  const created = await prisma.payrollPeriod.create({
    data: {
      periodName,
      startDate,
      endDate,
      payDate: s(formData.get("payDate")),
      status: "draft",
      notes: s(formData.get("notes")),
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/payroll");
  redirect(`/payroll/${created.id}`);
}

export async function updatePeriod(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.payrollPeriod.update({
    where: { id },
    data: {
      periodName: req(formData.get("periodName")),
      startDate: req(formData.get("startDate")),
      endDate: req(formData.get("endDate")),
      payDate: s(formData.get("payDate")),
      status: s(formData.get("status")) ?? "draft",
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${id}`);
  return {};
}

export async function deletePeriod(id: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.$transaction([
    prisma.payrollEntry.deleteMany({ where: { periodId: id } }),
    prisma.payrollPeriod.delete({ where: { id } }),
  ]);
  revalidatePath("/payroll");
  redirect("/payroll");
}

function pickEntryInputs(formData: FormData) {
  return {
    basicPay: num(formData.get("basicPay")),
    overtimePay: num(formData.get("overtimePay")),
    holidayPay: num(formData.get("holidayPay")),
    bonus: num(formData.get("bonus")),
    otherEarnings: num(formData.get("otherEarnings")),
    otherEarningsNote: s(formData.get("otherEarningsNote")),
    sss: num(formData.get("sss")),
    philhealth: num(formData.get("philhealth")),
    pagibig: num(formData.get("pagibig")),
    tax: num(formData.get("tax")),
    cashAdvance: num(formData.get("cashAdvance")),
    absences: num(formData.get("absences")),
    lateDeductions: num(formData.get("lateDeductions")),
    otherDeductions: num(formData.get("otherDeductions")),
    otherDeductionsNote: s(formData.get("otherDeductionsNote")),
    notes: s(formData.get("notes")),
    paidVia: s(formData.get("paidVia")),
    isPaid: String(formData.get("isPaid") ?? "") === "1" ? 1 : 0,
  };
}

export async function createEntry(
  periodId: number,
  employeeId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };

  const dupe = await prisma.payrollEntry.findFirst({
    where: { periodId, employeeId },
  });
  if (dupe)
    return { error: "This employee already has a payroll entry for this period." };

  const inputs = pickEntryInputs(formData);
  const t = totals(inputs);
  await prisma.payrollEntry.create({
    data: {
      periodId,
      employeeId,
      ...inputs,
      ...t,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath(`/payroll/${periodId}`);
  return {};
}

export async function updateEntry(
  entryId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const existing = await prisma.payrollEntry.findUnique({ where: { id: entryId } });
  if (!existing) return { error: "Entry not found." };
  const inputs = pickEntryInputs(formData);
  const t = totals(inputs);
  await prisma.payrollEntry.update({
    where: { id: entryId },
    data: { ...inputs, ...t },
  });
  revalidatePath(`/payroll/${existing.periodId}`);
  revalidatePath(`/payroll/${existing.periodId}/entries/${entryId}/payslip`);
  return {};
}

export async function deleteEntry(entryId: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const existing = await prisma.payrollEntry.findUnique({ where: { id: entryId } });
  if (!existing) return { error: "Entry not found." };
  await prisma.payrollEntry.delete({ where: { id: entryId } });
  revalidatePath(`/payroll/${existing.periodId}`);
  return {};
}

/** Create an entry for every active employee without one, seeded from their rate + statutory defaults. */
export async function bulkCreateEntries(
  periodId: number,
): Promise<{ error?: string; created?: number }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) return { error: "Period not found." };
  const [employees, existing] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: 1 } }),
    prisma.payrollEntry.findMany({
      where: { periodId },
      select: { employeeId: true },
    }),
  ]);
  const haveEntry = new Set(existing.map((e) => e.employeeId));
  const todo = employees.filter((e) => !haveEntry.has(e.id));
  if (todo.length === 0) return { created: 0 };

  const now = new Date().toISOString();
  const days =
    (new Date(period.endDate).getTime() -
      new Date(period.startDate).getTime()) /
      86400000 +
    1;
  const semi = days <= 17;

  let created = 0;
  for (const emp of todo) {
    const seed = await seedForEmployee(emp, period, semi);
    const inputs = {
      basicPay: seed.basicPay,
      overtimePay: 0,
      holidayPay: 0,
      bonus: 0,
      otherEarnings: 0,
      otherEarningsNote: seed.earningsNote,
      sss: seed.sss,
      philhealth: seed.philhealth,
      pagibig: seed.pagibig,
      tax: seed.tax,
      cashAdvance: 0,
      absences: 0,
      lateDeductions: 0,
      otherDeductions: 0,
      otherDeductionsNote: null,
      notes: seed.notes,
      paidVia: null,
      isPaid: 0,
    };
    const t = totals(inputs);
    await prisma.payrollEntry.create({
      data: {
        periodId,
        employeeId: emp.id,
        ...inputs,
        ...t,
        createdAt: now,
      },
    });
    created += 1;
  }
  revalidatePath(`/payroll/${periodId}`);
  return { created };
}

type EmpForSeed = {
  id: number;
  rateType: string;
  rateAmount: number;
};
type PeriodForSeed = {
  startDate: string;
  endDate: string;
};

/** Rate-type aware seed for a new payroll entry. */
async function seedForEmployee(
  emp: EmpForSeed,
  period: PeriodForSeed,
  semi: boolean,
): Promise<{
  basicPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  earningsNote: string | null;
  notes: string | null;
}> {
  if (emp.rateType === "per_service") {
    // Sum embalmer fees for services whose burial date falls inside the period.
    const services = await prisma.service.findMany({
      where: {
        embalmerId: emp.id,
        AND: [
          { burialDate: { gte: period.startDate } },
          { burialDate: { lte: period.endDate } },
        ],
      },
      select: { id: true, embalmerFee: true, burialDate: true },
    });
    const basicPay = services.reduce((a, s) => a + (s.embalmerFee ?? 0), 0);
    return {
      basicPay,
      sss: 0,
      philhealth: 0,
      pagibig: 0,
      tax: 0,
      earningsNote: `${services.length} service${services.length === 1 ? "" : "s"}`,
      notes: services.length
        ? `Per-service fees: ${services
            .map((s) => `${s.burialDate ?? "?"}: ₱${(s.embalmerFee ?? 0).toFixed(2)}`)
            .join(", ")}`
        : null,
    };
  }

  if (emp.rateType === "daily" || emp.rateType === "hourly") {
    // Leave blank — user sets days/hours manually.
    return {
      basicPay: 0,
      sss: 0,
      philhealth: 0,
      pagibig: 0,
      tax: 0,
      earningsNote: null,
      notes: `Set basic pay manually: rate ₱${emp.rateAmount.toFixed(2)} / ${emp.rateType}.`,
    };
  }

  // Default: monthly
  const monthly = emp.rateAmount;
  const sss = monthly > 0 ? computeSss(monthly) : 0;
  const philhealth = monthly > 0 ? computePhilHealth(monthly) : 0;
  const pagibig = monthly > 0 ? computePagIbig(monthly) : 0;
  const tax = monthly > 0 ? computeWht(monthly, sss, philhealth, pagibig) : 0;
  const scale = semi ? 0.5 : 1;
  return {
    basicPay: monthly > 0 ? (semi ? monthly / 2 : monthly) : 0,
    sss: +(sss * scale).toFixed(2),
    philhealth: +(philhealth * scale).toFixed(2),
    pagibig: +(pagibig * scale).toFixed(2),
    tax: +(tax * scale).toFixed(2),
    earningsNote: null,
    notes: null,
  };
}

export async function toggleEntryPaid(entryId: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const e = await prisma.payrollEntry.findUnique({ where: { id: entryId } });
  if (!e) return { error: "Entry not found." };
  await prisma.payrollEntry.update({
    where: { id: entryId },
    data: { isPaid: e.isPaid === 1 ? 0 : 1 },
  });
  revalidatePath(`/payroll/${e.periodId}`);
  return {};
}
