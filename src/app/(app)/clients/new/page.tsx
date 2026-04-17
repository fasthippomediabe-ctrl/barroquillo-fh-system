import { PageHeader, BackLink } from "@/components/PageHeader";
import ClientForm from "../ClientForm";
import { createClient } from "../actions";

export default function NewClientPage() {
  return (
    <div>
      <BackLink href="/clients" label="Back to clients" />
      <PageHeader title="New Client Record" />
      <ClientForm action={createClient} submitLabel="Create Record" />
    </div>
  );
}
