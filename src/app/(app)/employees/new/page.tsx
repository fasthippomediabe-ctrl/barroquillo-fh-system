import { PageHeader, BackLink } from "@/components/PageHeader";
import EmployeeForm from "../EmployeeForm";
import { createEmployee } from "../actions";

export default function NewEmployeePage() {
  return (
    <div>
      <BackLink href="/employees" label="Back to employees" />
      <PageHeader title="New Employee" />
      <EmployeeForm action={createEmployee} submitLabel="Create Employee" />
    </div>
  );
}
