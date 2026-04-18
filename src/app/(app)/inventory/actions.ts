"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkRole(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const role = (session?.user as any)?.role ?? "staff";
  if (!["admin", "manager", "accounting", "staff"].includes(role))
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
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  if (x === "") return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

async function resolveCategoryId(formData: FormData): Promise<number | null> {
  const raw = s(formData.get("categoryId"));
  if (!raw) return null;
  if (raw === "__new__") {
    const name = s(formData.get("newCategoryName"));
    if (!name) return null;
    const created = await prisma.inventoryCategory.create({
      data: { name, isActive: 1 },
    });
    return created.id;
  }
  return Number(raw);
}

export async function createInventoryItem(
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const name = req(formData.get("name"));
  if (!name) return { error: "Name is required." };

  const categoryId = await resolveCategoryId(formData);
  await prisma.inventory.create({
    data: {
      name,
      categoryId,
      description: s(formData.get("description")),
      unit: s(formData.get("unit")) ?? "pcs",
      quantity: num(formData.get("quantity")),
      reorderLevel: num(formData.get("reorderLevel")),
      costPerUnit: num(formData.get("costPerUnit")),
      sellingPrice: num(formData.get("sellingPrice")),
      location: s(formData.get("location")),
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  });
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateInventoryItem(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const name = req(formData.get("name"));
  if (!name) return { error: "Name is required." };
  const categoryId = await resolveCategoryId(formData);
  await prisma.inventory.update({
    where: { id },
    data: {
      name,
      categoryId,
      description: s(formData.get("description")),
      unit: s(formData.get("unit")) ?? "pcs",
      quantity: num(formData.get("quantity")),
      reorderLevel: num(formData.get("reorderLevel")),
      costPerUnit: num(formData.get("costPerUnit")),
      sellingPrice: num(formData.get("sellingPrice")),
      location: s(formData.get("location")),
    },
  });
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function toggleInventoryActive(
  id: number,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const cur = await prisma.inventory.findUnique({ where: { id } });
  if (!cur) return { error: "Item not found." };
  await prisma.inventory.update({
    where: { id },
    data: { isActive: cur.isActive === 1 ? 0 : 1 },
  });
  revalidatePath("/inventory");
  return {};
}

export async function deleteInventoryItem(
  id: number,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const moves = await prisma.inventoryMovement.count({ where: { itemId: id } });
  if (moves > 0)
    return {
      error: `Cannot delete — ${moves} stock movement${moves === 1 ? "" : "s"} reference this item. Disable it instead to keep history.`,
    };
  await prisma.inventory.delete({ where: { id } });
  revalidatePath("/inventory");
  return {};
}

export async function adjustStock(
  itemId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await checkRole();
  if (!gate.ok) return { error: gate.error };
  const type = s(formData.get("type"));
  if (!type) return { error: "Type is required." };
  const quantity = num(formData.get("quantity"));
  if (quantity <= 0) return { error: "Quantity must be greater than 0." };
  const date =
    s(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
  const unitCost = num(formData.get("unitCost"));

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        itemId,
        date,
        type,
        quantity,
        unitCost,
        reference: s(formData.get("reference")),
        notes: s(formData.get("notes")),
        createdAt: new Date().toISOString(),
      },
    });
    const item = await tx.inventory.findUnique({ where: { id: itemId } });
    if (item) {
      const delta = type === "in" || type === "purchase" ? quantity : -quantity;
      await tx.inventory.update({
        where: { id: itemId },
        data: { quantity: Math.max(0, item.quantity + delta) },
      });
    }
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return {};
}
