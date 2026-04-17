import { PageHeader, BackLink } from "@/components/PageHeader";
import { createPeriod } from "../actions";
import PeriodForm from "../PeriodForm";

export default function NewPeriodPage() {
  return (
    <div>
      <BackLink href="/payroll" label="Back to payroll" />
      <PageHeader title="New Pay Period" />
      <PeriodForm action={createPeriod} submitLabel="Create Period" />
    </div>
  );
}
