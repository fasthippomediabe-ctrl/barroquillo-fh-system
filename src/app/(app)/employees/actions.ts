"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkRole(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager", "hr"].includes(role))
    return { ok: false, error: "Only admins, managers, and HR can manage employees." };
  return { ok: true };
}

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function req(v: FormDataEntryValue | null): string {
  const x = String(v ?? "").trim();
  return x;
}
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  return x === "" ? 0 : Number(x);
}

export async function createEmployee(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const firstName = req(formData.get("firstName"));
  const lastName = req(formData.get("lastName"));
  if (!firstName || !lastName)
    return { error: "First name and last name are required." };

  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      middleName: s(formData.get("middleName")),
      birthday: s(formData.get("birthday")),
      gender: s(formData.get("gender")),
      civilStatus: s(formData.get("civilStatus")),
      position: s(formData.get("position")),
      department: s(formData.get("department")),
      employmentType: s(formData.get("employmentType")) ?? "regular",
      rateType: s(formData.get("rateType")) ?? "monthly",
      rateAmount: num(formData.get("rateAmount")),
      phone: s(formData.get("phone")),
      email: s(formData.get("email")),
      address: s(formData.get("address")),
      sssNumber: s(formData.get("sssNumber")),
      philhealthNumber: s(formData.get("philhealthNumber")),
      pagibigNumber: s(formData.get("pagibigNumber")),
      tinNumber: s(formData.get("tinNumber")),
      emergencyName: s(formData.get("emergencyName")),
      emergencyRelationship: s(formData.get("emergencyRelationship")),
      emergencyPhone: s(formData.get("emergencyPhone")),
      dateHired: s(formData.get("dateHired")),
      dateRegularized: s(formData.get("dateRegularized")),
      education: s(formData.get("education")),
      skills: s(formData.get("skills")),
      notes: s(formData.get("notes")),
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployee(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const firstName = req(formData.get("firstName"));
  const lastName = req(formData.get("lastName"));
  if (!firstName || !lastName)
    return { error: "First name and last name are required." };

  await prisma.employee.update({
    where: { id },
    data: {
      firstName,
      lastName,
      middleName: s(formData.get("middleName")),
      birthday: s(formData.get("birthday")),
      gender: s(formData.get("gender")),
      civilStatus: s(formData.get("civilStatus")),
      position: s(formData.get("position")),
      department: s(formData.get("department")),
      employmentType: s(formData.get("employmentType")) ?? "regular",
      rateType: s(formData.get("rateType")) ?? "monthly",
      rateAmount: num(formData.get("rateAmount")),
      phone: s(formData.get("phone")),
      email: s(formData.get("email")),
      address: s(formData.get("address")),
      sssNumber: s(formData.get("sssNumber")),
      philhealthNumber: s(formData.get("philhealthNumber")),
      pagibigNumber: s(formData.get("pagibigNumber")),
      tinNumber: s(formData.get("tinNumber")),
      emergencyName: s(formData.get("emergencyName")),
      emergencyRelationship: s(formData.get("emergencyRelationship")),
      emergencyPhone: s(formData.get("emergencyPhone")),
      dateHired: s(formData.get("dateHired")),
      dateRegularized: s(formData.get("dateRegularized")),
      education: s(formData.get("education")),
      skills: s(formData.get("skills")),
      notes: s(formData.get("notes")),
    },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function toggleEmployeeActive(
  id: number,
  reason?: string,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return { error: "Employee not found." };
  const becomingInactive = emp.isActive === 1;
  await prisma.employee.update({
    where: { id },
    data: {
      isActive: becomingInactive ? 0 : 1,
      dateSeparated: becomingInactive
        ? new Date().toISOString().slice(0, 10)
        : null,
      separationReason: becomingInactive ? reason ?? "Separated" : null,
    },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return {};
}

export async function deleteEmployee(id: number): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/employees");
  redirect("/employees");
}
