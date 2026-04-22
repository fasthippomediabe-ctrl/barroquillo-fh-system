"use client";
import { useRef, useState, useTransition } from "react";
import { postComment, deleteComment } from "../actions";

type CommentRow = {
  id: number;
  message: string;
  createdAt: string | null;
  user: { id: number; displayName: string; role: string };
};

function roleBadgeClass(role: string): string {
  if (role === "admin") return "badge-cancelled";
  if (role === "accounting" || role === "manager") return "badge-warn";
  return "badge-active";
}

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CommentThread({
  requestId,
  comments,
  canComment,
  currentUserId,
  isAdmin,
}: {
  requestId: number;
  comments: CommentRow[];
  canComment: boolean;
  currentUserId: number;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="card no-print">
      <h3 className="font-bold mb-3">
        Conversation
        <span className="text-xs font-normal text-[#4a5678] ml-2">
          ({comments.length})
        </span>
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-[#4a5678] mb-4">
          No messages yet.
          {canComment
            ? " Start the conversation — ask a question or share a clarification."
            : ""}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 mb-4">
          {comments.map((c) => {
            const mine = c.user.id === currentUserId;
            return (
              <li
                key={c.id}
                className={`rounded-lg p-3 border ${
                  mine
                    ? "bg-[var(--brand-bg-alt)] border-[#d6dcec]"
                    : "bg-white border-[#e5ebf5]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-sm">
                  <span className="font-semibold text-[var(--brand-navy)]">
                    {c.user.displayName}
                  </span>
                  <span
                    className={`badge ${roleBadgeClass(c.user.role)} text-[10px] px-1.5 py-0.5`}
                  >
                    {c.user.role}
                  </span>
                  <span className="text-xs text-[#4a5678] ml-auto">
                    {when(c.createdAt)}
                  </span>
                  {(mine || isAdmin) && (
                    <button
                      type="button"
                      className="text-xs text-[#c0392b] hover:underline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          if (!confirm("Delete this message?")) return;
                          const res = await deleteComment(c.id);
                          if (res?.error) alert(res.error);
                        })
                      }
                    >
                      delete
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.message}</p>
              </li>
            );
          })}
        </ul>
      )}

      {canComment && (
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              setErr(null);
              const res = await postComment(requestId, fd);
              if (res?.error) {
                setErr(res.error);
                return;
              }
              formRef.current?.reset();
            })
          }
          className="flex flex-col gap-2"
        >
          <textarea
            name="message"
            rows={2}
            required
            maxLength={2000}
            placeholder="Write a message — e.g., please attach the official quotation"
            className="textarea"
          />
          {err && (
            <div className="text-xs rounded px-2 py-1 bg-[#fbdcdc] text-[#c0392b]">
              {err}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
