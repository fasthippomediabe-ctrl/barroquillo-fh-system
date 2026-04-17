import { prisma } from "@/lib/prisma";

export async function getServiceBalance(serviceId: number): Promise<number> {
  const svc = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { totalAmount: true, discount: true },
  });
  if (!svc) return 0;
  const net = (svc.totalAmount ?? 0) - (svc.discount ?? 0);
  const paid = await prisma.payment.aggregate({
    where: { serviceId },
    _sum: { amount: true },
  });
  return net - (paid._sum.amount ?? 0);
}

export async function getServiceBalances(
  serviceIds: number[],
): Promise<Map<number, number>> {
  if (serviceIds.length === 0) return new Map();
  const svcs = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, totalAmount: true, discount: true },
  });
  const pays = await prisma.payment.groupBy({
    by: ["serviceId"],
    where: { serviceId: { in: serviceIds } },
    _sum: { amount: true },
  });
  const paidMap = new Map<number, number>(
    pays.map((p) => [p.serviceId, p._sum.amount ?? 0]),
  );
  return new Map(
    svcs.map((s) => [
      s.id,
      (s.totalAmount ?? 0) - (s.discount ?? 0) - (paidMap.get(s.id) ?? 0),
    ]),
  );
}

export function deceasedName(c: {
  deceasedFirstName: string;
  deceasedLastName: string;
}): string {
  return `${c.deceasedFirstName} ${c.deceasedLastName}`.trim();
}
