import { PageHeader, BackLink } from "@/components/PageHeader";
import PayrollCalculator from "../PayrollCalculator";

export const dynamic = "force-dynamic";

export default function PayrollCalculatorPage() {
  return (
    <div>
      <BackLink href="/payroll" label="Back to payroll" />
      <PageHeader
        title="Statutory Calculator"
        subtitle="PH contributions — SSS, PhilHealth, Pag-IBIG, Withholding Tax, 13th Month"
      />
      <PayrollCalculator />
    </div>
  );
}
