"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id?: number;
  deceasedFirstName: string;
  deceasedLastName: string;
  deceasedMiddleName: string | null;
  deceasedAge: number | null;
  deceasedGender: string | null;
  deceasedBirthday: string | null;
  deceasedDateOfDeath: string | null;
  deceasedCauseOfDeath: string | null;
  deceasedAddress: string | null;
  contactName: string;
  contactRelationship: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  notes: string | null;
};

export default function ClientForm({
  initial,
  action,
  submitLabel = "Save",
}: {
  initial?: Partial<Client>;
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const v = (k: keyof Client) => {
    const x = initial?.[k];
    return x == null ? "" : String(x);
  };

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="flex flex-col gap-6"
    >
      <div className="card">
        <h3 className="font-bold mb-4">Deceased Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="First Name *" name="deceasedFirstName" value={v("deceasedFirstName")} required />
          <Field label="Middle Name" name="deceasedMiddleName" value={v("deceasedMiddleName")} />
          <Field label="Last Name *" name="deceasedLastName" value={v("deceasedLastName")} required />
          <Field label="Age" name="deceasedAge" type="number" value={v("deceasedAge")} />
          <SelectField
            label="Gender"
            name="deceasedGender"
            value={v("deceasedGender")}
            options={["", "Male", "Female", "Other"]}
          />
          <Field label="Birthday" name="deceasedBirthday" type="date" value={v("deceasedBirthday")} />
          <Field label="Date of Death" name="deceasedDateOfDeath" type="date" value={v("deceasedDateOfDeath")} />
          <Field label="Cause of Death" name="deceasedCauseOfDeath" value={v("deceasedCauseOfDeath")} />
          <Field label="Address" name="deceasedAddress" value={v("deceasedAddress")} />
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-4">Contact / Family Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Contact Name *" name="contactName" value={v("contactName")} required />
          <Field label="Relationship" name="contactRelationship" value={v("contactRelationship")} />
          <Field label="Phone" name="contactPhone" value={v("contactPhone")} />
          <Field label="Email" name="contactEmail" type="email" value={v("contactEmail")} />
          <Field
            label="Contact Address"
            name="contactAddress"
            value={v("contactAddress")}
            className="md:col-span-2"
          />
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-4">Notes</h3>
        <textarea
          name="notes"
          defaultValue={v("notes")}
          className="textarea"
          rows={4}
        />
      </div>

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
  className,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-semibold ${className ?? ""}`}>
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

function SelectField({
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
