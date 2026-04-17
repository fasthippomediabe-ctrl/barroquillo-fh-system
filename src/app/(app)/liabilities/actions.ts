"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkRole(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager", "accounting"].includes(role))
    return { ok: false, error: "You don't have permission for this." };
  return { ok: true };
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  return x === "" ? 0 : Number(x);
}

export async function createLiability(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };

  const name = s(formData.get("name"));
  if (!name) return { error: "Name is required." };
  const principal = num(formData.get("principalAmount"));
  if (principal <= 0) return { error: "Principal must be greater than 0." };

  await prisma.liability.create({
    data: {
      name,
      type: s(formData.get("type")) ?? "loan",
      creditor: s(formData.get("creditor")),
      principalAmount: principal,
      remainingBalance: num(formData.get("remainingBalance")) || principal,
      interestRate: num(formData.get("interestRate")),
      monthlyPayment: num(formData.get("monthlyPayment")),
      dueDate: s(formData.get("dueDate")),
      status: s(formData.get("status")) ?? "active",
      notes: s(formData.get("notes")),
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/liabilities");
  redirect("/liabilities");
}

export async function updateLiability(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };

  const name = s(formData.get("name"));
  if (!name) return { error: "Name is required." };
  const principal = num(formData.get("principalAmount"));
  if (principal <= 0) return { error: "Principal must be greater than 0." };

  await prisma.liability.update({
    where: { id },
    data: {
      name,
      type: s(formData.get("type")) ?? "loan",
      creditor: s(formData.get("creditor")),
      principalAmount: principal,
      remainingBalance: num(formData.get("remainingBalance")),
      interestRate: num(formData.get("interestRate")),
      monthlyPayment: num(formData.get("monthlyPayment")),
      dueDate: s(formData.get("dueDate")),
      status: s(formData.get("status")) ?? "active",
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/liabilities");
  revalidatePath(`/liabilities/${id}`);
  redirect(`/liabilities/${id}`);
}

export async function deleteLiability(id: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.$transaction([
    prisma.liabilityPayment.deleteMany({ where: { liabilityId: id } }),
    prisma.liability.delete({ where: { id } }),
  ]);
  revalidatePath("/liabilities");
  return {};
}

export async function recordLiabilityPayment(
  liabilityId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const amount = num(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const date =
    s(formData.get("date")) ?? new Date().toISOString().slice(0, 10);

  await prisma.$transaction(async (tx) => {
    await tx.liabilityPayment.create({
      data: {
        liabilityId,
        date,
        amount,
        notes: s(formData.get("notes")),
        createdAt: new Date().toISOString(),
      },
    });
    const liab = await tx.liability.findUnique({ where: { id: liabilityId } });
    if (liab) {
      const newBal = Math.max(0, liab.remainingBalance - amount);
      await tx.liability.update({
        where: { id: liabilityId },
        data: {
          remainingBalance: newBal,
          status: newBal === 0 ? "paid" : liab.status,
        },
      });
    }
  });
  revalidatePath("/liabilities");
  revalidatePath(`/liabilities/${liabilityId}`);
  return {};
}

export async function deleteLiabilityPayment(
  paymentId: number,
  liabilityId: number,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.$transaction(async (tx) => {
    const pay = await tx.liabilityPayment.findUnique({
      where: { id: paymentId },
    });
    if (!pay) return;
    await tx.liabilityPayment.delete({ where: { id: paymentId } });
    const liab = await tx.liability.findUnique({ where: { id: liabilityId } });
    if (liab) {
      await tx.liability.update({
        where: { id: liabilityId },
        data: {
          remainingBalance: liab.remainingBalance + pay.amount,
          status: liab.status === "paid" ? "active" : liab.status,
        },
      });
    }
  });
  revalidatePath(`/liabilities/${liabilityId}`);
  revalidatePath("/liabilities");
  return {};
}
