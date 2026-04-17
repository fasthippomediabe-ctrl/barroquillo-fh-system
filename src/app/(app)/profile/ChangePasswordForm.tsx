"use client";
import { useState, useTransition } from "react";
import { changePassword } from "./actions";

export default function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null);
          try {
            await changePassword(fd);
            setMsg({ kind: "ok", text: "Password updated." });
            (document.getElementById("pwdForm") as HTMLFormElement)?.reset();
          } catch (e) {
            setMsg({ kind: "err", text: (e as Error).message });
          }
        })
      }
      id="pwdForm"
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Current password
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        New password
        <input
          type="password"
          name="newPassword"
          required
          minLength={6}
          autoComplete="new-password"
          className="input"
        />
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Updating…" : "Update Password"}
      </button>
      {msg && (
        <div
          className={`text-sm rounded-md px-3 py-2 ${
            msg.kind === "ok"
              ? "bg-[#d4f5de] text-[#27613a]"
              : "bg-[#fbdcdc] text-[#c0392b]"
          }`}
        >
          {msg.text}
        </div>
      )}
    </form>
  );
}
