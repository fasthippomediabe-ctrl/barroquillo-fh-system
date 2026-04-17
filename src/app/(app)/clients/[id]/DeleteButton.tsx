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
          try {
            await deleteClient(id);
          } catch (e) {
            alert((e as Error).message);
          }
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
