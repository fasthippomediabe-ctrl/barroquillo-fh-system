"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  return x === "" ? 0 : Number(x);
}

export async function createService(formData: FormData) {
  const clientId = Number(formData.get("clientId"));
  if (!Number.isFinite(clientId)) throw new Error("Client is required");
  const packageIdRaw = s(formData.get("packageId"));
  const created = await prisma.service.create({
    data: {
      clientId,
      packageId: packageIdRaw ? Number(packageIdRaw) : null,
      customServiceName: s(formData.get("customServiceName")),
      wakeStartDate: s(formData.get("wakeStartDate")),
      wakeEndDate: s(formData.get("wakeEndDate")),
      burialDate: s(formData.get("burialDate")),
      burialLocation: s(formData.get("burialLocation")),
      totalAmount: num(formData.get("totalAmount")),
      discount: num(formData.get("discount")),
      status: "active",
      notes: s(formData.get("notes")),
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/services");
  revalidatePath("/");
  redirect(`/services/${created.id}`);
}

export async function updateService(id: number, formData: FormData) {
  const packageIdRaw = s(formData.get("packageId"));
  await prisma.service.update({
    where: { id },
    data: {
      packageId: packageIdRaw ? Number(packageIdRaw) : null,
      customServiceName: s(formData.get("customServiceName")),
      wakeStartDate: s(formData.get("wakeStartDate")),
      wakeEndDate: s(formData.get("wakeEndDate")),
      burialDate: s(formData.get("burialDate")),
      burialLocation: s(formData.get("burialLocation")),
      totalAmount: num(formData.get("totalAmount")),
      discount: num(formData.get("discount")),
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/services");
  revalidatePath(`/services/${id}`);
  redirect(`/services/${id}`);
}

export async function setServiceStatus(id: number, status: "active" | "completed" | "cancelled") {
  await prisma.service.update({ where: { id }, data: { status } });
  revalidatePath("/services");
  revalidatePath(`/services/${id}`);
  revalidatePath("/");
}

export async function recordPayment(
  serviceId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const amount = num(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  await prisma.payment.create({
    data: {
      serviceId,
      date: s(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
      amount,
      method: s(formData.get("method")) ?? "cash",
      reference: s(formData.get("reference")),
      notes: s(formData.get("notes")),
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/payments");
  revalidatePath("/");
  return {};
}

export async function deletePayment(paymentId: number, serviceId: number) {
  await prisma.payment.delete({ where: { id: paymentId } });
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/payments");
  revalidatePath("/");
}
