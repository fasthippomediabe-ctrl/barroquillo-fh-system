"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  birthday?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  position?: string | null;
  department?: string | null;
  employmentType?: string;
  rateType?: string;
  rateAmount?: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  sssNumber?: string | null;
  philhealthNumber?: string | null;
  pagibigNumber?: string | null;
  tinNumber?: string | null;
  emergencyName?: string | null;
  emergencyRelationship?: string | null;
  emergencyPhone?: string | null;
  dateHired?: string | null;
  dateRegularized?: string | null;
  education?: string | null;
  skills?: string | null;
  notes?: string | null;
};

export default function EmployeeForm({
  action,
  initial,
  submitLabel = "Save",
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await action(fd);
          if (res?.error) setErr(res.error);
        })
      }
      className="flex flex-col gap-4"
    >
      <section className="card">
        <h3 className="font-bold mb-3">Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="First Name *" name="firstName" value={v(initial?.firstName)} required />
          <Field label="Middle Name" name="middleName" value={v(initial?.middleName)} />
          <Field label="Last Name *" name="lastName" value={v(initial?.lastName)} required />
          <Field label="Birthday" name="birthday" type="date" value={v(initial?.birthday)} />
          <Select
            label="Gender"
            name="gender"
            value={v(initial?.gender)}
            options={["", "Male", "Female", "Other"]}
          />
          <Select
            label="Civil Status"
            name="civilStatus"
            value={v(initial?.civilStatus)}
            options={["", "Single", "Married", "Widowed", "Separated", "Divorced"]}
          />
          <Field label="Phone" name="phone" value={v(initial?.phone)} />
          <Field label="Email" name="email" type="email" value={v(initial?.email)} />
          <Field label="Address" name="address" value={v(initial?.address)} />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Employment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Position" name="position" value={v(initial?.position)} />
          <Field label="Department" name="department" value={v(initial?.department)} />
          <Select
            label="Employment Type"
            name="employmentType"
            value={v(initial?.employmentType ?? "regular")}
            options={["regular", "probationary", "contractual", "project-based", "part-time"]}
          />
          <Select
            label="Rate Type"
            name="rateType"
            value={v(initial?.rateType ?? "monthly")}
            options={["monthly", "daily", "hourly"]}
          />
          <Field
            label="Rate Amount (₱)"
            name="rateAmount"
            type="number"
            value={v(initial?.rateAmount ?? 0)}
          />
          <Field
            label="Date Hired"
            name="dateHired"
            type="date"
            value={v(initial?.dateHired)}
          />
          <Field
            label="Date Regularized"
            name="dateRegularized"
            type="date"
            value={v(initial?.dateRegularized)}
          />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Government IDs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="SSS #" name="sssNumber" value={v(initial?.sssNumber)} />
          <Field label="PhilHealth #" name="philhealthNumber" value={v(initial?.philhealthNumber)} />
          <Field label="Pag-IBIG #" name="pagibigNumber" value={v(initial?.pagibigNumber)} />
          <Field label="TIN" name="tinNumber" value={v(initial?.tinNumber)} />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name" name="emergencyName" value={v(initial?.emergencyName)} />
          <Field label="Relationship" name="emergencyRelationship" value={v(initial?.emergencyRelationship)} />
          <Field label="Phone" name="emergencyPhone" value={v(initial?.emergencyPhone)} />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">201 File Extras</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Education
            <textarea name="education" defaultValue={v(initial?.education)} rows={2} className="textarea" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Skills
            <textarea name="skills" defaultValue={v(initial?.skills)} rows={2} className="textarea" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Notes
            <textarea name="notes" defaultValue={v(initial?.notes)} rows={3} className="textarea" />
          </label>
        </div>
      </section>

      {err && (
        <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
          {err}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        className="input"
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <select name={name} defaultValue={value} className="select">
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}
