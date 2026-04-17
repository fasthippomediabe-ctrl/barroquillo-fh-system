import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/PageHeader";
import PaymentEditForm from "./PaymentEditForm";

export const dynamic = "force-dynamic";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { service: { include: { client: true } } },
  });
  if (!payment) notFound();

  return (
    <div>
      <BackLink
        href={`/services/${payment.serviceId}`}
        label="Back to service"
      />
      <PageHeader
        title="Edit Payment"
        subtitle={`${payment.service.client.deceasedFirstName} ${payment.service.client.deceasedLastName} · Payment #${payment.id}`}
      />
      <PaymentEditForm
        paymentId={payment.id}
        serviceId={payment.serviceId}
        initial={{
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
        }}
      />
    </div>
  );
}
