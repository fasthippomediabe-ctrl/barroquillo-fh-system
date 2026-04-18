import { PageHeader, BackLink } from "@/components/PageHeader";
import SupplierForm from "../SupplierForm";
import { createSupplier } from "../actions";

export default function NewSupplierPage() {
  return (
    <div>
      <BackLink href="/suppliers" label="Back to suppliers" />
      <PageHeader title="New Supplier" />
      <SupplierForm action={createSupplier} submitLabel="Create Supplier" />
    </div>
  );
}
