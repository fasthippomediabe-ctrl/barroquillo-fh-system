"use client";
import { useTransition } from "react";
import { setServiceStatus } from "../actions";

export default function StatusActions({
  id,
  currentStatus,
}: {
  id: number;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {currentStatus === "active" && (
        <>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (confirm("Mark this service as completed?"))
                  await setServiceStatus(id, "completed");
              })
            }
          >
            Mark Completed
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (confirm("Cancel this service?"))
                  await setServiceStatus(id, "cancelled");
              })
            }
          >
            Cancel
          </button>
        </>
      )}
      {currentStatus !== "active" && (
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => start(() => setServiceStatus(id, "active"))}
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
