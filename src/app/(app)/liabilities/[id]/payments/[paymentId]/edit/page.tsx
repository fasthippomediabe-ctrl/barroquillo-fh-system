import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import { listAttachments } from "@/lib/attachments";
import EditPaymentForm from "./EditPaymentForm";

export const dynamic = "force-dynamic";

export default async function EditLiabilityPaymentPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id: idStr, paymentId: paymentIdStr } = await params;
  const id = Number(idStr);
  const paymentId = Number(paymentIdStr);
  if (!Number.isFinite(id) || !Number.isFinite(paymentId)) notFound();

  const [payment, attachments] = await Promise.all([
    prisma.liabilityPayment.findUnique({
      where: { id: paymentId },
      include: { liability: true },
    }),
    listAttachments("liability_payment", paymentId),
  ]);
  if (!payment) notFound();

  return (
    <div>
      <BackLink href={`/liabilities/${id}`} label="Back to liability" />
      <PageHeader
        title={`Edit Payment — ${payment.liability.name}`}
        subtitle={`Payment #${payment.id}`}
      />
      <EditPaymentForm
        paymentId={paymentId}
        liabilityId={id}
        initial={{
          date: payment.date,
          amount: payment.amount,
          notes: payment.notes,
        }}
        attachments={attachments}
      />
    </div>
  );
}
