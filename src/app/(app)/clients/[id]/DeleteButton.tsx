"use client";
import { useTransition } from "react";
import { deleteClient } from "../actions";

export default function DeleteButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this client record? Cannot be undone.")) return;
        start(async () => {
          const result = await deleteClient(id);
          if (result?.error) alert(result.error);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
