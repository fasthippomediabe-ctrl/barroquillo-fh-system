"use client";
import { useTransition } from "react";
import { deleteRequest } from "../actions";

export default function DeleteRequestButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Delete this request permanently? Attachments and comments will also be removed. Cannot be undone.",
          )
        )
          return;
        start(async () => {
          const res = await deleteRequest(id);
          if (res?.error) alert(res.error);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete Request"}
    </button>
  );
}
