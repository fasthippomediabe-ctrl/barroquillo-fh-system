import { PageHeader } from "@/components/PageHeader";
import PayrollCalculator from "./PayrollCalculator";

export const dynamic = "force-dynamic";

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="PH mandatory contributions — SSS, PhilHealth, Pag-IBIG, Withholding Tax, 13th Month"
      />
      <PayrollCalculator />
    </div>
  );
}
