"use client";
import { useState, useTransition } from "react";
import {
  approveRequest,
  rejectRequest,
  releaseRequest,
} from "../actions";

export default function ReviewActions({
  id,
  status,
  type,
}: {
  id: number;
  status: string;
  amount: number;
  type: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "approve" | "reject" | "release">(
    "none",
  );
  const today = new Date().toISOString().slice(0, 10);

  if (mode === "none") {
    return (
      <div className="flex gap-3 flex-wrap">
        {status === "pending" && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMode("approve")}
            >
              Approve
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => setMode("reject")}
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => setMode("release")}
        >
          {status === "approved" ? "Release Funds" : "Approve & Release"}
        </button>
      </div>
    );
  }

  if (mode === "approve") {
    return (
      <form
        action={(fd) =>
          start(async () => {
            setErr(null);
            const res = await approveRequest(id, fd);
            if (res?.error) setErr(res.error);
          })
        }
        className="flex flex-col gap-3"
      >
        <p className="text-sm">
          Mark this request as <strong>approved</strong>. Funds are not yet
          released — click <em>Release</em> when you actually disburse the
          money.
        </p>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Notes (optional)
          <textarea
            name="reviewNotes"
            rows={2}
            className="textarea"
            placeholder="e.g., Approved pending receipt of vendor invoice"
          />
        </label>
        {err && (
          <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
            {err}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode("none")}
          >
            Back
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Approving…" : "Confirm Approval"}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "reject") {
    return (
      <form
        action={(fd) =>
          start(async () => {
            setErr(null);
            const res = await rejectRequest(id, fd);
            if (res?.error) setErr(res.error);
          })
        }
        className="flex flex-col gap-3"
      >
        <p className="text-sm">
          Mark this request as <strong>rejected</strong>. A reason is required
          so the requester understands why.
        </p>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Reason *
          <textarea
            name="reviewNotes"
            rows={3}
            required
            className="textarea"
            placeholder="e.g., Insufficient company fund. Please resubmit after month-end."
          />
        </label>
        {err && (
          <div className="text-sm rounded-md px-3 py-2 bg-[#fbdcdc] text-[#c0392b]">
            {err}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode("none")}
          >
            Back
          </button>
          <button type="submit" className="btn-danger" disabled={pending}>
            {pending ? "Rejecting…" : "Confirm Rejection"}
          </button>
        </div>
      </form>
    );
  }

  // release
  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await releaseRequest(id, fd);
          if (res?.error) setErr(res.error);
        })
      }
      className="flex flex-col gap-3"
    >
      <p className="text-sm">
        Releasing marks the cash as actually disbursed and automatically
        creates the matching{" "}
        <strong>
          {type === "expense" ? "expense" : "liability payment"}
        </strong>{" "}
        record, copying all attachments onto it for audit.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Release Date
          <input
            type="date"
            name="releaseDate"
            defaultValue={today}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Reference / OR #
          <input name="reference" className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
          Notes (optional)
          <textarea
            name="releaseNotes"
            rows={2}
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
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setMode("none")}
        >
          Back
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Releasing…" : "Confirm Release"}
        </button>
      </div>
    </form>
  );
}
