import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel server-action body limit
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
export const ALLOWED_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

type EntityType =
  | "expense"
  | "liability_payment"
  | "payment"
  | "branch_request";

function prefixFor(entityType: EntityType): string {
  switch (entityType) {
    case "expense":
      return "receipts/expenses";
    case "liability_payment":
      return "receipts/liabilities";
    case "payment":
      return "receipts/payments";
    case "branch_request":
      return "receipts/requests";
  }
}

function safeName(name: string): string {
  return name
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);
}

export async function listAttachments(
  entityType: EntityType,
  entityId: number,
) {
  return prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { id: "asc" },
  });
}

export async function listAttachmentsMany(
  entityType: EntityType,
  entityIds: number[],
) {
  if (entityIds.length === 0) return new Map<number, typeof items>();
  const items = await prisma.attachment.findMany({
    where: { entityType, entityId: { in: entityIds } },
    orderBy: { id: "asc" },
  });
  const map = new Map<number, typeof items>();
  for (const it of items) {
    const arr = map.get(it.entityId) ?? [];
    arr.push(it);
    map.set(it.entityId, arr);
  }
  return map;
}

/** Uploads every non-empty File under the given form field to Vercel Blob
 *  and records a row in the attachments table for each one. */
export async function uploadAttachments(
  entityType: EntityType,
  entityId: number,
  formData: FormData,
  fieldName = "attachments",
): Promise<{ error?: string; count?: number }> {
  const files = formData.getAll(fieldName).filter(
    (v): v is File => v instanceof File && v.size > 0,
  );
  if (files.length === 0) return { count: 0 };

  for (const f of files) {
    if (f.size > MAX_ATTACHMENT_BYTES)
      return {
        error: `"${f.name}" is larger than 4 MB. Each file must be 4 MB or smaller.`,
      };
    if (f.type && !ALLOWED_ATTACHMENT_TYPES.has(f.type))
      return {
        error: `"${f.name}" is not a supported type. Use JPG, PNG, WebP, HEIC, or PDF.`,
      };
  }

  const prefix = prefixFor(entityType);
  const now = new Date().toISOString();
  for (const f of files) {
    const key = `${prefix}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(f.name)}`;
    const blob = await put(key, f, {
      access: "public",
      contentType: f.type || undefined,
    });
    await prisma.attachment.create({
      data: {
        entityType,
        entityId,
        url: blob.url,
        filename: f.name,
        size: f.size,
        contentType: f.type || null,
        createdAt: now,
      },
    });
  }
  return { count: files.length };
}

/** Deletes the given attachment IDs (both the blob and the DB row). */
export async function deleteAttachmentsByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = await prisma.attachment.findMany({ where: { id: { in: ids } } });
  await Promise.all(
    rows.map(async (r) => {
      try {
        await del(r.url);
      } catch {
        /* non-fatal */
      }
    }),
  );
  await prisma.attachment.deleteMany({ where: { id: { in: ids } } });
}

/** Removes every attachment tied to the entity. Call from parent delete flows. */
export async function deleteAllAttachmentsFor(
  entityType: EntityType,
  entityId: number,
): Promise<void> {
  const rows = await prisma.attachment.findMany({
    where: { entityType, entityId },
  });
  if (rows.length === 0) return;
  await Promise.all(
    rows.map(async (r) => {
      try {
        await del(r.url);
      } catch {
        /* non-fatal */
      }
    }),
  );
  await prisma.attachment.deleteMany({
    where: { entityType, entityId },
  });
}

/** Pulls an array of numeric IDs from a form field that may contain
 *  multiple values ("removeAttachmentId" checkboxes, etc.). */
export function idsFromForm(
  formData: FormData,
  fieldName: string,
): number[] {
  return formData
    .getAll(fieldName)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
}
