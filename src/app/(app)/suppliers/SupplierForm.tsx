"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  businessName?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  gcashNumber?: string | null;
  mayaNumber?: string | null;
  productsSupplied?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
};

export default function SupplierForm({
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
  const v = (x: string | null | undefined) => (x == null ? "" : x);

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
        <h3 className="font-bold mb-3">Business Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Business Name *
            <input
              name="businessName"
              required
              defaultValue={v(initial?.businessName)}
              className="input"
            />
          </label>
          <Field label="Contact Person" name="contactPerson" value={v(initial?.contactPerson)} />
          <Field label="Phone" name="phone" value={v(initial?.phone)} />
          <Field label="Email" name="email" type="email" value={v(initial?.email)} />
          <Field label="Address" name="address" value={v(initial?.address)} />
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Products / Services Supplied
            <textarea
              name="productsSupplied"
              rows={2}
              defaultValue={v(initial?.productsSupplied)}
              className="textarea"
              placeholder="e.g., caskets, urns, flowers, embalming chemicals"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Bank Name" name="bankName" value={v(initial?.bankName)} />
          <Field label="Bank Account Name" name="bankAccountName" value={v(initial?.bankAccountName)} />
          <Field label="Bank Account #" name="bankAccountNumber" value={v(initial?.bankAccountNumber)} />
          <Field label="Payment Terms" name="paymentTerms" value={v(initial?.paymentTerms)} />
          <Field label="GCash Number" name="gcashNumber" value={v(initial?.gcashNumber)} />
          <Field label="Maya Number" name="mayaNumber" value={v(initial?.mayaNumber)} />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-3">Notes</h3>
        <textarea
          name="notes"
          rows={3}
          defaultValue={v(initial?.notes)}
          className="textarea"
        />
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
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input name={name} type={type} defaultValue={value} className="input" />
    </label>
  );
}
