"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CategoryOpt = { id: number; name: string };

type Initial = {
  name?: string;
  categoryId?: number | null;
  description?: string | null;
  unit?: string;
  quantity?: number;
  reorderLevel?: number;
  costPerUnit?: number;
  sellingPrice?: number;
  location?: string | null;
};

export default function InventoryForm({
  action,
  initial,
  categories,
  submitLabel = "Save",
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: Initial;
  categories: CategoryOpt[];
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [catId, setCatId] = useState<string>(
    initial?.categoryId != null ? String(initial.categoryId) : "",
  );
  const router = useRouter();

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
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Name *
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="input"
            placeholder="e.g., Premium Hardwood Casket"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Category
          <select
            name="categoryId"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="select"
          >
            <option value="">— Uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Add new category…</option>
          </select>
        </label>
        {catId === "__new__" && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            New Category Name *
            <input
              name="newCategoryName"
              className="input"
              placeholder="e.g., Caskets"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Unit
          <input
            name="unit"
            defaultValue={initial?.unit ?? "pcs"}
            className="input"
            placeholder="pcs / kg / L / box"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Location
          <input
            name="location"
            defaultValue={initial?.location ?? ""}
            className="input"
            placeholder="e.g., Main Warehouse, Shelf A-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Quantity on Hand
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.quantity ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Reorder Level
          <input
            name="reorderLevel"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.reorderLevel ?? 0}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Cost / Unit (₱)
          <input
            name="costPerUnit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.costPerUnit ?? 0}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Selling Price (₱)
          <input
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.sellingPrice ?? 0}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ""}
            className="textarea"
          />
        </label>
      </div>

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
