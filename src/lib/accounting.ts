import { prisma } from "@/lib/prisma";

export type PeriodFilter =
  | { kind: "all" }
  | { kind: "month"; yyyymm: string }
  | { kind: "range"; start: string; end: string };

function dateWhere(period: PeriodFilter): { gte: string; lte: string } | undefined {
  if (period.kind === "all") return undefined;
  if (period.kind === "month") {
    const [y, m] = period.yyyymm.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 0).toISOString().slice(0, 10);
    return { gte: start, lte: end };
  }
  return { gte: period.start, lte: period.end };
}

export type ServiceProfit = {
  serviceId: number;
  clientName: string;
  packageName: string | null;
  burialDate: string | null;
  status: string;
  revenue: number;
  directExpenses: number;
  net: number;
  distributions: { shareId: number; name: string; percent: number; amount: number }[];
};

/**
 * For each service, computes revenue (sum of payments), direct expenses
 * (expenses linked to the service), net profit, and how that net is
 * split across the active profit shares.
 *
 * Payments/expenses are filtered by their own date against the period,
 * so a service spanning months can appear in multiple period reports.
 */
export async function getServiceProfits(
  period: PeriodFilter = { kind: "all" },
): Promise<ServiceProfit[]> {
  const dateFilter = dateWhere(period);

  const [services, shares, paymentRows, expenseRows] = await Promise.all([
    prisma.service.findMany({
      include: { client: true, package: true },
      orderBy: [{ burialDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.profitShare.findMany({
      where: { isActive: 1 },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.payment.findMany({
      where: dateFilter ? { date: dateFilter } : undefined,
      select: { serviceId: true, amount: true },
    }),
    prisma.expense.findMany({
      where: {
        AND: [
          { serviceId: { not: null } },
          dateFilter ? { date: dateFilter } : {},
        ],
      },
      select: { serviceId: true, amount: true },
    }),
  ]);

  const revenueByService = new Map<number, number>();
  for (const p of paymentRows) {
    revenueByService.set(
      p.serviceId,
      (revenueByService.get(p.serviceId) ?? 0) + p.amount,
    );
  }
  const expensesByService = new Map<number, number>();
  for (const e of expenseRows) {
    if (e.serviceId == null) continue;
    expensesByService.set(
      e.serviceId,
      (expensesByService.get(e.serviceId) ?? 0) + e.amount,
    );
  }

  const rows: ServiceProfit[] = services
    .map((s) => {
      const revenue = revenueByService.get(s.id) ?? 0;
      const directExpenses = expensesByService.get(s.id) ?? 0;
      const net = revenue - directExpenses;
      return {
        serviceId: s.id,
        clientName: `${s.client.deceasedFirstName} ${s.client.deceasedLastName}`,
        packageName: s.package?.name ?? s.customServiceName ?? null,
        burialDate: s.burialDate,
        status: s.status,
        revenue,
        directExpenses,
        net,
        distributions: shares.map((sh) => ({
          shareId: sh.id,
          name: sh.name,
          percent: sh.percent,
          amount: (net * sh.percent) / 100,
        })),
      };
    })
    // Only surface services with activity in the period
    .filter((r) => r.revenue !== 0 || r.directExpenses !== 0);
  return rows;
}

export type AccountingSummary = {
  period: PeriodFilter;
  shares: { id: number; name: string; percent: number; bankInfo: string | null }[];
  serviceRows: ServiceProfit[];
  totals: {
    serviceRevenue: number;
    serviceDirectExpenses: number;
    serviceNet: number;
    overheadExpenses: number;
  };
  perShareTotals: { shareId: number; name: string; percent: number; amount: number }[];
  companyFund: {
    shareId: number | null;
    name: string;
    grossFromServices: number;
    overheadDeduction: number;
    net: number;
  };
  overheadList: {
    id: number;
    date: string;
    amount: number;
    description: string | null;
    categoryName: string | null;
    reference: string | null;
  }[];
};

/**
 * Full P&L view for a period. Distributes per-service net across active shares,
 * then deducts overhead (expenses with no service link) from whichever share
 * represents the company fund — by convention the largest share.
 */
export async function getAccountingSummary(
  period: PeriodFilter = { kind: "all" },
): Promise<AccountingSummary> {
  const dateFilter = dateWhere(period);

  const [shares, serviceRows, overhead, overheadList] = await Promise.all([
    prisma.profitShare.findMany({
      where: { isActive: 1 },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    getServiceProfits(period),
    prisma.expense.aggregate({
      where: {
        AND: [{ serviceId: null }, dateFilter ? { date: dateFilter } : {}],
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        AND: [{ serviceId: null }, dateFilter ? { date: dateFilter } : {}],
      },
      include: { category: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
  ]);

  const sharesOut = shares.map((s) => ({
    id: s.id,
    name: s.name,
    percent: s.percent,
    bankInfo: s.bankInfo,
  }));

  const serviceRevenue = serviceRows.reduce((a, r) => a + r.revenue, 0);
  const serviceDirectExpenses = serviceRows.reduce(
    (a, r) => a + r.directExpenses,
    0,
  );
  const serviceNet = serviceRevenue - serviceDirectExpenses;
  const overheadExpenses = overhead._sum.amount ?? 0;

  const perShareTotals = shares.map((sh) => ({
    shareId: sh.id,
    name: sh.name,
    percent: sh.percent,
    amount: (serviceNet * sh.percent) / 100,
  }));

  // Company fund = largest share by convention
  const fundShare = shares.length
    ? [...shares].sort((a, b) => b.percent - a.percent)[0]
    : null;
  const fundGross =
    perShareTotals.find((p) => p.shareId === fundShare?.id)?.amount ?? 0;
  const companyFund = {
    shareId: fundShare?.id ?? null,
    name: fundShare?.name ?? "Company Fund",
    grossFromServices: fundGross,
    overheadDeduction: overheadExpenses,
    net: fundGross - overheadExpenses,
  };

  return {
    period,
    shares: sharesOut,
    serviceRows,
    totals: {
      serviceRevenue,
      serviceDirectExpenses,
      serviceNet,
      overheadExpenses,
    },
    perShareTotals,
    companyFund,
    overheadList: overheadList.map((e) => ({
      id: e.id,
      date: e.date,
      amount: e.amount,
      description: e.description,
      categoryName: e.category?.name ?? null,
      reference: e.reference,
    })),
  };
}
