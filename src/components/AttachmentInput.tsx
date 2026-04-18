"use client";
import { useState } from "react";
import { ALLOWED_ACCEPT } from "@/lib/attachments";

export type AttachmentLite = {
  id: number;
  url: string;
  filename: string;
  size: number;
  contentType: string | null;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * File input for multi-file attachments. Renders the existing attachments
 * with a checkbox to mark for removal, plus a multi-file <input type=file>
 * to queue new uploads. Both sides are submitted with the parent form.
 */
export default function AttachmentInput({
  existing,
  label = "Receipts / Attachments",
  hint = "JPG, PNG, WebP, HEIC, or PDF — up to 4 MB each. Select multiple at once.",
  name = "attachments",
  removeFieldName = "removeAttachmentId",
}: {
  existing: AttachmentLite[];
  label?: string;
  hint?: string;
  name?: string;
  removeFieldName?: string;
}) {
  const [queued, setQueued] = useState<File[]>([]);

  return (
    <div className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>

      {existing.length > 0 && (
        <div className="flex flex-col gap-2 bg-[var(--brand-bg-alt)] rounded-lg p-3">
          <div className="text-xs text-[#4a5678] font-normal">
            Current attachments ({existing.length})
          </div>
          {existing.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 bg-white rounded border border-[#e5ebf5] px-3 py-2 text-sm"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-blue)] hover:underline font-semibold flex-1 truncate"
                title={a.filename}
              >
                📎 {a.filename}
              </a>
              <span className="text-xs text-[#4a5678] font-normal">
                {humanSize(a.size)}
              </span>
              <label className="flex items-center gap-1 text-xs font-normal text-[#c0392b] whitespace-nowrap">
                <input type="checkbox" name={removeFieldName} value={a.id} />
                Remove
              </label>
            </div>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1 font-normal">
        <span className="text-xs text-[#4a5678]">{hint}</span>
        <input
          type="file"
          name={name}
          accept={ALLOWED_ACCEPT}
          multiple
          className="input !py-1.5"
          onChange={(e) => setQueued(Array.from(e.target.files ?? []))}
        />
        {queued.length > 0 && (
          <div className="text-xs text-[#4a5678] font-normal mt-1">
            Will upload: {queued.map((f) => f.name).join(", ")}
          </div>
        )}
      </label>
    </div>
  );
}
