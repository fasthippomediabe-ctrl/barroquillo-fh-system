"use client";
import { useState, useTransition, useRef } from "react";
import { createUser } from "./actions";

export default function NewUserForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setMsg(null);
          const res = await createUser(fd);
          if (res?.error) {
            setMsg({ kind: "err", text: res.error });
            return;
          }
          setMsg({ kind: "ok", text: "User created." });
          formRef.current?.reset();
        })
      }
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Full Name *
        <input
          name="displayName"
          className="input"
          required
          placeholder="e.g., Maria Santos"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Username *
        <input
          name="username"
          className="input"
          required
          pattern="[a-z0-9_.\-]+"
          placeholder="e.g., maria"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Password *
        <input
          name="password"
          type="password"
          className="input"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Confirm Password *
        <input
          name="confirmPassword"
          type="password"
          className="input"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
        Role
        <select name="role" defaultValue="staff" className="select">
          <option value="staff">Staff — Dashboard, Clients, Services, Payments, Inventory</option>
          <option value="manager">Manager — everything except Payroll & Admin</option>
          <option value="hr">HR — + Expenses, Payroll, Reports</option>
          <option value="accounting">Accounting — finance modules</option>
          <option value="admin">Admin — full access incl. user management</option>
        </select>
      </label>

      <div className="md:col-span-2 flex items-center justify-between gap-3 mt-1">
        {msg ? (
          <div
            className={`text-sm rounded-md px-3 py-2 ${
              msg.kind === "ok"
                ? "bg-[#d4f5de] text-[#27613a]"
                : "bg-[#fbdcdc] text-[#c0392b]"
            }`}
          >
            {msg.text}
          </div>
        ) : (
          <span />
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}
