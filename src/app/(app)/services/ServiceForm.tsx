"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = { id: number; label: string };
type PackageOption = { id: number; name: string; basePrice: number };
type EmbalmerOption = { id: number; label: string; defaultFee: number };

type Initial = {
  clientId?: number;
  packageId?: number | null;
  customServiceName?: string | null;
  wakeStartDate?: string | null;
  wakeEndDate?: string | null;
  burialDate?: string | null;
  burialLocation?: string | null;
  totalAmount?: number;
  discount?: number;
  notes?: string | null;
  embalmerId?: number | null;
  embalmerFee?: number;
};

export default function ServiceForm({
  action,
  submitLabel = "Save",
  clients,
  packages,
  embalmers = [],
  initial,
  lockedClientId,
}: {
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
  clients: ClientOption[];
  packages: PackageOption[];
  embalmers?: EmbalmerOption[];
  initial?: Initial;
  lockedClientId?: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [pkgId, setPkgId] = useState<string>(
    initial?.packageId != null ? String(initial.packageId) : "",
  );
  const [total, setTotal] = useState<string>(
    initial?.totalAmount != null ? String(initial.totalAmount) : "",
  );
  const [embalmerId, setEmbalmerId] = useState<string>(
    initial?.embalmerId != null ? String(initial.embalmerId) : "",
  );
  const [embalmerFee, setEmbalmerFee] = useState<string>(
    initial?.embalmerFee != null ? String(initial.embalmerFee) : "0",
  );

  const onEmbalmerChange = (v: string) => {
    setEmbalmerId(v);
    if (v && !initial) {
      const emb = embalmers.find((x) => String(x.id) === v);
      if (emb && emb.defaultFee > 0) setEmbalmerFee(String(emb.defaultFee));
    }
  };

  const onPkgChange = (v: string) => {
    setPkgId(v);
    if (v) {
      const p = packages.find((x) => String(x.id) === v);
      if (p) setTotal(String(p.basePrice));
    }
  };

  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="flex flex-col gap-6"
    >
      <div className="card">
        <h3 className="font-bold mb-4">Service Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Client (Deceased) *
            <select
              name="clientId"
              defaultValue={v(initial?.clientId ?? lockedClientId)}
              className="select"
              required
              disabled={!!lockedClientId}
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.label}
                </option>
              ))}
            </select>
            {lockedClientId && (
              <input type="hidden" name="clientId" value={String(lockedClientId)} />
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Service Package
            <select
              name="packageId"
              value={pkgId}
              onChange={(e) => onPkgChange(e.target.value)}
              className="select"
            >
              <option value="">— Custom —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₱{p.basePrice.toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Custom Service Name
            <input
              name="customServiceName"
              defaultValue={v(initial?.customServiceName)}
              className="input"
              placeholder="(leave blank if using a package)"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Burial Location
            <input
              name="burialLocation"
              defaultValue={v(initial?.burialLocation)}
              className="input"
              placeholder="e.g., Roxas City Public Cemetery"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Total Amount (₱) *
            <input
              name="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="input"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Discount (₱)
            <input
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={v(initial?.discount ?? 0)}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Wake Start Date
            <input
              name="wakeStartDate"
              type="date"
              defaultValue={v(initial?.wakeStartDate)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Wake End Date
            <input
              name="wakeEndDate"
              type="date"
              defaultValue={v(initial?.wakeEndDate)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            Burial / Cremation Date
            <input
              name="burialDate"
              type="date"
              defaultValue={v(initial?.burialDate)}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Embalmer / Per-Service Staff
            <select
              name="embalmerId"
              value={embalmerId}
              onChange={(e) => onEmbalmerChange(e.target.value)}
              className="select"
            >
              <option value="">— None —</option>
              {embalmers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Embalmer Fee (₱)
            <input
              name="embalmerFee"
              type="number"
              step="0.01"
              min="0"
              value={embalmerFee}
              onChange={(e) => setEmbalmerFee(e.target.value)}
              className="input"
              disabled={!embalmerId}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Service Notes</h3>
        <textarea
          name="notes"
          defaultValue={v(initial?.notes)}
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
