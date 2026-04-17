"use client";
import { useTransition } from "react";
import { deletePeriod } from "../actions";

export default function DeletePeriodButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Delete this pay period and all its entries? Cannot be undone.",
          )
        )
          return;
        start(async () => {
          const r = await deletePeriod(id);
          if (r?.error) alert(r.error);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete Period"}
    </button>
  );
}
