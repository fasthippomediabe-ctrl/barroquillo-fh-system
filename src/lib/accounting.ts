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
    liabilityPayments: number;
    salariesPaid: number;
    newBorrowings: number;
  };
  perShareTotals: { shareId: number; name: string; percent: number; amount: number }[];
  companyFund: {
    shareId: number | null;
    name: string;
    grossFromServices: number;
    overheadDeduction: number;
    liabilityDeduction: number;
    salaryDeduction: number;
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
  liabilityPaymentsList: {
    id: number;
    date: string;
    amount: number;
    liabilityName: string;
    creditor: string | null;
    notes: string | null;
  }[];
  salariesList: {
    id: number;
    employeeName: string;
    position: string | null;
    periodName: string;
    payDate: string | null;
    netPay: number;
    paidVia: string | null;
  }[];
  activeLiabilities: {
    id: number;
    name: string;
    creditor: string | null;
    type: string;
    principalAmount: number;
    remainingBalance: number;
    dueDate: string | null;
    status: string;
  }[];
  newBorrowingsList: {
    id: number;
    name: string;
    creditor: string | null;
    type: string;
    principalAmount: number;
    remainingBalance: number;
    loanDate: string | null;
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

  const [
    shares,
    serviceRows,
    overhead,
    overheadList,
    liabilityPayments,
    paidEntries,
    activeLiabilities,
  ] = await Promise.all([
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
    prisma.liabilityPayment.findMany({
      where: dateFilter ? { date: dateFilter } : undefined,
      include: { liability: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    // Salary = payroll entries marked paid, attributed to the period's pay_date
    prisma.payrollEntry.findMany({
      where: {
        isPaid: 1,
        ...(dateFilter ? { period: { payDate: dateFilter } } : {}),
      },
      include: { employee: true, period: true },
      orderBy: [{ period: { payDate: "desc" } }, { id: "desc" }],
    }),
    // Active liabilities with outstanding balance — shown at bottom of report
    // regardless of period filter so the total debt position is always visible
    prisma.liability.findMany({
      where: { status: "active" },
      orderBy: [{ remainingBalance: "desc" }],
    }),
  ]);

  // New borrowings = liabilities whose loanDate (the day the cash was
  // actually received) falls inside the period. loanDate MUST be set
  // explicitly — legacy loans with no loanDate are never counted as
  // funding received, only as outstanding debt.
  const newBorrowings = dateFilter
    ? await prisma.liability.findMany({
        where: { loanDate: dateFilter },
        orderBy: [{ loanDate: "desc" }],
      })
    : await prisma.liability.findMany({
        where: { loanDate: { not: null } },
        orderBy: [{ loanDate: "desc" }],
      });

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
  const liabilityPaymentsTotal = liabilityPayments.reduce(
    (a, p) => a + p.amount,
    0,
  );
  const salariesPaidTotal = paidEntries.reduce((a, e) => a + e.netPay, 0);
  const newBorrowingsTotal = newBorrowings.reduce(
    (a, l) => a + l.principalAmount,
    0,
  );

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
    liabilityDeduction: liabilityPaymentsTotal,
    salaryDeduction: salariesPaidTotal,
    net:
      fundGross - overheadExpenses - liabilityPaymentsTotal - salariesPaidTotal,
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
      liabilityPayments: liabilityPaymentsTotal,
      salariesPaid: salariesPaidTotal,
      newBorrowings: newBorrowingsTotal,
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
    liabilityPaymentsList: liabilityPayments.map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      liabilityName: p.liability.name,
      creditor: p.liability.creditor,
      notes: p.notes,
    })),
    salariesList: paidEntries.map((e) => ({
      id: e.id,
      employeeName: `${e.employee.lastName}, ${e.employee.firstName}`,
      position: e.employee.position,
      periodName: e.period.periodName,
      payDate: e.period.payDate,
      netPay: e.netPay,
      paidVia: e.paidVia,
    })),
    activeLiabilities: activeLiabilities.map((l) => ({
      id: l.id,
      name: l.name,
      creditor: l.creditor,
      type: l.type,
      principalAmount: l.principalAmount,
      remainingBalance: l.remainingBalance,
      dueDate: l.dueDate,
      status: l.status,
    })),
    newBorrowingsList: newBorrowings.map((l) => ({
      id: l.id,
      name: l.name,
      creditor: l.creditor,
      type: l.type,
      principalAmount: l.principalAmount,
      remainingBalance: l.remainingBalance,
      loanDate: l.loanDate,
    })),
  };
}
