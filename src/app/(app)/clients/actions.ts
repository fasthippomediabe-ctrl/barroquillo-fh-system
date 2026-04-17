"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new Error("Not authorized");
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function req(v: FormDataEntryValue | null): string {
  const x = String(v ?? "").trim();
  if (!x) throw new Error("Required field missing");
  return x;
}
function n(v: FormDataEntryValue | null): number | null {
  const x = String(v ?? "").trim();
  if (!x) return null;
  const num = Number(x);
  return Number.isFinite(num) ? num : null;
}

export async function createClient(formData: FormData) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  requireRole(role, ["admin", "manager", "staff"]);
  const created = await prisma.client.create({
    data: {
      deceasedFirstName: req(formData.get("deceasedFirstName")),
      deceasedLastName: req(formData.get("deceasedLastName")),
      deceasedMiddleName: s(formData.get("deceasedMiddleName")),
      deceasedAge: n(formData.get("deceasedAge")) ?? undefined,
      deceasedGender: s(formData.get("deceasedGender")),
      deceasedBirthday: s(formData.get("deceasedBirthday")),
      deceasedDateOfDeath: s(formData.get("deceasedDateOfDeath")),
      deceasedCauseOfDeath: s(formData.get("deceasedCauseOfDeath")),
      deceasedAddress: s(formData.get("deceasedAddress")),
      contactName: req(formData.get("contactName")),
      contactRelationship: s(formData.get("contactRelationship")),
      contactPhone: s(formData.get("contactPhone")),
      contactEmail: s(formData.get("contactEmail")),
      contactAddress: s(formData.get("contactAddress")),
      notes: s(formData.get("notes")),
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/clients");
  redirect(`/clients/${created.id}`);
}

export async function updateClient(id: number, formData: FormData) {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  requireRole(role, ["admin", "manager", "staff"]);
  await prisma.client.update({
    where: { id },
    data: {
      deceasedFirstName: req(formData.get("deceasedFirstName")),
      deceasedLastName: req(formData.get("deceasedLastName")),
      deceasedMiddleName: s(formData.get("deceasedMiddleName")),
      deceasedAge: n(formData.get("deceasedAge")),
      deceasedGender: s(formData.get("deceasedGender")),
      deceasedBirthday: s(formData.get("deceasedBirthday")),
      deceasedDateOfDeath: s(formData.get("deceasedDateOfDeath")),
      deceasedCauseOfDeath: s(formData.get("deceasedCauseOfDeath")),
      deceasedAddress: s(formData.get("deceasedAddress")),
      contactName: req(formData.get("contactName")),
      contactRelationship: s(formData.get("contactRelationship")),
      contactPhone: s(formData.get("contactPhone")),
      contactEmail: s(formData.get("contactEmail")),
      contactAddress: s(formData.get("contactAddress")),
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(
  id: number,
): Promise<{ error?: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager"].includes(role)) {
    return { error: "Only admins and managers can delete client records." };
  }

  const services = await prisma.service.findMany({
    where: { clientId: id },
    select: { id: true, status: true },
  });
  const blocking = services.filter((s) => s.status !== "cancelled");
  if (blocking.length > 0) {
    return {
      error: `Cannot delete: this record has ${blocking.length} active/completed service${blocking.length === 1 ? "" : "s"}. Cancel or delete them first.`,
    };
  }

  // Cancelled services get cascaded. Preserve financial history on expenses
  // and inventory_movements by nulling out the service link rather than
  // deleting those rows.
  const serviceIds = services.map((s) => s.id);
  await prisma.$transaction(async (tx) => {
    if (serviceIds.length > 0) {
      await tx.payment.deleteMany({ where: { serviceId: { in: serviceIds } } });
      await tx.expense.updateMany({
        where: { serviceId: { in: serviceIds } },
        data: { serviceId: null },
      });
      await tx.inventoryMovement.updateMany({
        where: { serviceId: { in: serviceIds } },
        data: { serviceId: null },
      });
      await tx.service.deleteMany({ where: { id: { in: serviceIds } } });
    }
    await tx.client.delete({ where: { id } });
  });

  revalidatePath("/clients");
  redirect("/clients");
}
