"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  uploadAttachments,
  deleteAttachmentsByIds,
  deleteAllAttachmentsFor,
  idsFromForm,
  listAttachments,
} from "@/lib/attachments";

function s(v: FormDataEntryValue | null): string | null {
  const x = String(v ?? "").trim();
  return x === "" ? null : x;
}
function num(v: FormDataEntryValue | null): number {
  const x = String(v ?? "").trim();
  if (x === "") return 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function intOrNull(v: FormDataEntryValue | null): number | null {
  const x = s(v);
  if (!x) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function getSession() {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  if (!u) return null;
  return {
    id: Number(u.id),
    role: (u.role ?? "staff") as string,
    name: u.name ?? u.username,
  };
}

function canReview(role: string) {
  return role === "admin" || role === "accounting";
}

function bump(id?: number) {
  revalidatePath("/requests");
  if (id) revalidatePath(`/requests/${id}`);
  revalidatePath("/");
}

/** Anyone logged in can file a request. */
export async function createRequest(
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };

  const type = s(formData.get("type"));
  if (type !== "expense" && type !== "liability_payment")
    return { error: "Invalid request type." };

  const amount = num(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };

  if (type === "liability_payment") {
    const liabilityId = intOrNull(formData.get("liabilityId"));
    if (!liabilityId) return { error: "Pick a liability to pay." };
  }

  const created = await prisma.branchRequest.create({
    data: {
      type,
      status: "pending",
      amount,
      description: s(formData.get("description")),
      justification: s(formData.get("justification")),
      neededByDate: s(formData.get("neededByDate")),
      categoryId: type === "expense" ? intOrNull(formData.get("categoryId")) : null,
      accountId: type === "expense" ? intOrNull(formData.get("accountId")) : null,
      serviceId: type === "expense" ? intOrNull(formData.get("serviceId")) : null,
      liabilityId:
        type === "liability_payment"
          ? intOrNull(formData.get("liabilityId"))
          : null,
      reference: s(formData.get("reference")),
      requestedByUserId: me.id,
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  });

  const attach = await uploadAttachments(
    "branch_request",
    created.id,
    formData,
  );
  if (attach.error) return { error: attach.error };

  bump();
  redirect(`/requests/${created.id}`);
}

/** Requester can edit amount / justification / attachments while still pending. */
export async function updateRequest(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status !== "pending")
    return { error: "Only pending requests can be edited." };
  if (r.requestedByUserId !== me.id && !canReview(me.role))
    return { error: "You can only edit your own pending requests." };

  const amount = num(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than 0." };

  await prisma.branchRequest.update({
    where: { id },
    data: {
      amount,
      description: s(formData.get("description")),
      justification: s(formData.get("justification")),
      neededByDate: s(formData.get("neededByDate")),
      categoryId:
        r.type === "expense" ? intOrNull(formData.get("categoryId")) : null,
      accountId:
        r.type === "expense" ? intOrNull(formData.get("accountId")) : null,
      serviceId:
        r.type === "expense" ? intOrNull(formData.get("serviceId")) : null,
      liabilityId:
        r.type === "liability_payment"
          ? intOrNull(formData.get("liabilityId"))
          : null,
      reference: s(formData.get("reference")),
    },
  });

  const removeIds = idsFromForm(formData, "removeAttachmentId");
  if (removeIds.length > 0) await deleteAttachmentsByIds(removeIds);
  const attach = await uploadAttachments(
    "branch_request",
    id,
    formData,
  );
  if (attach.error) return { error: attach.error };

  bump(id);
  return {};
}

/** Requester can withdraw their own pending request. */
export async function cancelRequest(
  id: number,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status !== "pending")
    return { error: "Only pending requests can be cancelled." };
  if (r.requestedByUserId !== me.id && !canReview(me.role))
    return { error: "You can only cancel your own requests." };
  await prisma.branchRequest.update({
    where: { id },
    data: {
      status: "cancelled",
      reviewerUserId: me.id,
      reviewedAt: new Date().toISOString(),
    },
  });
  bump(id);
  return {};
}

export async function approveRequest(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  if (!canReview(me.role))
    return { error: "Only admins and accounting can approve requests." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status !== "pending")
    return { error: "Only pending requests can be approved." };

  await prisma.branchRequest.update({
    where: { id },
    data: {
      status: "approved",
      reviewerUserId: me.id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: s(formData.get("reviewNotes")),
    },
  });
  bump(id);
  return {};
}

export async function rejectRequest(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  if (!canReview(me.role))
    return { error: "Only admins and accounting can reject requests." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status !== "pending")
    return { error: "Only pending requests can be rejected." };
  const notes = s(formData.get("reviewNotes"));
  if (!notes) return { error: "Please add a reason for rejection." };

  await prisma.branchRequest.update({
    where: { id },
    data: {
      status: "rejected",
      reviewerUserId: me.id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
    },
  });
  bump(id);
  return {};
}

/** Release = money actually goes out. Creates the underlying expense /
 *  liability_payment and copies the request's attachments onto it. */
export async function releaseRequest(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  if (!canReview(me.role))
    return { error: "Only admins and accounting can release requests." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status !== "approved" && r.status !== "pending")
    return { error: "Only approved (or pending) requests can be released." };

  const releaseDate =
    s(formData.get("releaseDate")) ?? new Date().toISOString().slice(0, 10);
  const reference = s(formData.get("reference")) ?? r.reference;
  const notes = s(formData.get("releaseNotes"));
  const nowIso = new Date().toISOString();

  // Pull attachments from the request so we can duplicate them onto the
  // resulting expense/liability_payment for audit.
  const atts = await listAttachments("branch_request", id);

  if (r.type === "expense") {
    await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          date: releaseDate,
          amount: r.amount,
          categoryId: r.categoryId,
          accountId: r.accountId,
          serviceId: r.serviceId,
          description: r.description,
          reference,
          createdAt: nowIso,
        },
      });
      // Copy attachments onto the new expense so the paper trail follows.
      for (const a of atts) {
        await tx.attachment.create({
          data: {
            entityType: "expense",
            entityId: exp.id,
            url: a.url,
            filename: a.filename,
            size: a.size,
            contentType: a.contentType,
            createdAt: nowIso,
          },
        });
      }
      await tx.branchRequest.update({
        where: { id },
        data: {
          status: "released",
          releasedByUserId: me.id,
          releasedAt: nowIso,
          resultingExpenseId: exp.id,
          reviewNotes: notes ?? r.reviewNotes,
          // If it was still pending, also set reviewer to releaser
          reviewerUserId: r.reviewerUserId ?? me.id,
          reviewedAt: r.reviewedAt ?? nowIso,
        },
      });
    });
    revalidatePath("/expenses");
    bump(id);
    return {};
  } else {
    if (!r.liabilityId) return { error: "Request has no liability linked." };
    await prisma.$transaction(async (tx) => {
      const pay = await tx.liabilityPayment.create({
        data: {
          liabilityId: r.liabilityId!,
          date: releaseDate,
          amount: r.amount,
          notes: r.description ?? r.justification,
          createdAt: nowIso,
        },
      });
      const liab = await tx.liability.findUnique({
        where: { id: r.liabilityId! },
      });
      if (liab) {
        const newBal = Math.max(0, liab.remainingBalance - r.amount);
        await tx.liability.update({
          where: { id: r.liabilityId! },
          data: {
            remainingBalance: newBal,
            status: newBal === 0 ? "paid" : liab.status,
          },
        });
      }
      for (const a of atts) {
        await tx.attachment.create({
          data: {
            entityType: "liability_payment",
            entityId: pay.id,
            url: a.url,
            filename: a.filename,
            size: a.size,
            contentType: a.contentType,
            createdAt: nowIso,
          },
        });
      }
      await tx.branchRequest.update({
        where: { id },
        data: {
          status: "released",
          releasedByUserId: me.id,
          releasedAt: nowIso,
          resultingLiabilityPaymentId: pay.id,
          reviewNotes: notes ?? r.reviewNotes,
          reviewerUserId: r.reviewerUserId ?? me.id,
          reviewedAt: r.reviewedAt ?? nowIso,
        },
      });
    });
    revalidatePath(`/liabilities/${r.liabilityId}`);
    revalidatePath("/liabilities");
    bump(id);
    return {};
  }
}

export async function deleteRequest(
  id: number,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  if (!canReview(me.role))
    return { error: "Only admins and accounting can delete requests." };
  const r = await prisma.branchRequest.findUnique({ where: { id } });
  if (!r) return { error: "Request not found." };
  if (r.status === "released")
    return {
      error:
        "Released requests cannot be deleted (money already went out). Delete the resulting expense/payment directly if needed.",
    };
  await deleteAllAttachmentsFor("branch_request", id);
  await prisma.branchRequest.delete({ where: { id } });
  bump();
  redirect("/requests");
}

/** Post a comment on a request. Visible to anyone with access to the request. */
export async function postComment(
  requestId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const message = s(formData.get("message"));
  if (!message) return { error: "Type a message first." };
  if (message.length > 2000)
    return { error: "Message is too long (2000 characters max)." };

  const r = await prisma.branchRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requestedByUserId: true },
  });
  if (!r) return { error: "Request not found." };
  const isOwner = r.requestedByUserId === me.id;
  if (!isOwner && !canReview(me.role) && me.role !== "manager")
    return { error: "You don't have access to this request." };

  await prisma.requestComment.create({
    data: {
      requestId,
      userId: me.id,
      message,
      createdAt: new Date().toISOString(),
    },
  });
  bump(requestId);
  return {};
}

/** Delete own comment (or admin override). */
export async function deleteComment(
  commentId: number,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Not signed in." };
  const c = await prisma.requestComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, requestId: true },
  });
  if (!c) return { error: "Comment not found." };
  if (c.userId !== me.id && me.role !== "admin")
    return { error: "You can only delete your own comments." };
  await prisma.requestComment.delete({ where: { id: commentId } });
  bump(c.requestId);
  return {};
}
