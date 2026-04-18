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
function req(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export async function createSupplier(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const businessName = req(formData.get("businessName"));
  if (!businessName) return { error: "Business name is required." };

  await prisma.supplier.create({
    data: {
      businessName,
      contactPerson: s(formData.get("contactPerson")),
      phone: s(formData.get("phone")),
      email: s(formData.get("email")),
      address: s(formData.get("address")),
      bankName: s(formData.get("bankName")),
      bankAccountName: s(formData.get("bankAccountName")),
      bankAccountNumber: s(formData.get("bankAccountNumber")),
      gcashNumber: s(formData.get("gcashNumber")),
      mayaNumber: s(formData.get("mayaNumber")),
      productsSupplied: s(formData.get("productsSupplied")),
      paymentTerms: s(formData.get("paymentTerms")),
      notes: s(formData.get("notes")),
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const businessName = req(formData.get("businessName"));
  if (!businessName) return { error: "Business name is required." };
  await prisma.supplier.update({
    where: { id },
    data: {
      businessName,
      contactPerson: s(formData.get("contactPerson")),
      phone: s(formData.get("phone")),
      email: s(formData.get("email")),
      address: s(formData.get("address")),
      bankName: s(formData.get("bankName")),
      bankAccountName: s(formData.get("bankAccountName")),
      bankAccountNumber: s(formData.get("bankAccountNumber")),
      gcashNumber: s(formData.get("gcashNumber")),
      mayaNumber: s(formData.get("mayaNumber")),
      productsSupplied: s(formData.get("productsSupplied")),
      paymentTerms: s(formData.get("paymentTerms")),
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect("/suppliers");
}

export async function toggleSupplierActive(
  id: number,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const cur = await prisma.supplier.findUnique({ where: { id } });
  if (!cur) return { error: "Supplier not found." };
  await prisma.supplier.update({
    where: { id },
    data: { isActive: cur.isActive === 1 ? 0 : 1 },
  });
  revalidatePath("/suppliers");
  return {};
}

export async function deleteSupplier(id: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
  return {};
}
