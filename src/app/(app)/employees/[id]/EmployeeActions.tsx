"use client";
import { useTransition } from "react";
import { toggleEmployeeActive, deleteEmployee } from "../actions";

export default function EmployeeActions({
  id,
  isActive,
}: {
  id: number;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();

  const handleToggle = () => {
    if (isActive) {
      const reason = prompt(
        "Reason for separation? (e.g., Resigned, Retired, Terminated)",
      );
      if (reason === null) return;
      start(async () => {
        const r = await toggleEmployeeActive(id, reason || "Separated");
        if (r?.error) alert(r.error);
      });
    } else {
      if (!confirm("Reactivate this employee?")) return;
      start(async () => {
        const r = await toggleEmployeeActive(id);
        if (r?.error) alert(r.error);
      });
    }
  };

  const handleDelete = () => {
    if (
      !confirm(
        "Delete this employee's record permanently? Use Separate instead to keep the history.",
      )
    )
      return;
    start(async () => {
      const r = await deleteEmployee(id);
      if (r?.error) alert(r.error);
    });
  };

  return (
    <>
      <button
        type="button"
        className={isActive ? "btn-danger" : "btn-primary"}
        disabled={pending}
        onClick={handleToggle}
      >
        {isActive ? "Separate" : "Reactivate"}
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={handleDelete}
        title="Permanent delete"
      >
        Delete
      </button>
    </>
  );
}
