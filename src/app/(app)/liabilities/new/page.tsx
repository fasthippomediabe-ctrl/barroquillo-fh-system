import { PageHeader, BackLink } from "@/components/PageHeader";
import LiabilityForm from "../LiabilityForm";
import { createLiability } from "../actions";

export default function NewLiabilityPage() {
  return (
    <div>
      <BackLink href="/liabilities" label="Back to liabilities" />
      <PageHeader title="New Liability" />
      <LiabilityForm
        action={createLiability}
        submitLabel="Create Liability"
        isNew
      />
    </div>
  );
}
