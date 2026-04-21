"use client";
import { useTransition } from "react";
import { cancelRequest } from "../actions";

export default function CancelButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Withdraw this request?")) return;
        start(async () => {
          const r = await cancelRequest(id);
          if (r?.error) alert(r.error);
        });
      }}
    >
      {pending ? "Cancelling…" : "Withdraw"}
    </button>
  );
}
