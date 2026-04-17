"use client";
import { useTransition } from "react";
import {
  toggleUserActive,
  changeUserRole,
  resetUserPassword,
  deleteUser,
} from "./actions";

type Role = "staff" | "manager" | "hr" | "accounting" | "admin";

export default function UserActions({
  id,
  username,
  isActive,
  role,
  isSelf,
}: {
  id: number;
  username: string;
  isActive: boolean;
  role: Role;
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const isPrimary = username === "admin";

  const handleRole = (newRole: Role) => {
    if (newRole === role) return;
    start(async () => {
      const r = await changeUserRole(id, newRole);
      if (r?.error) alert(r.error);
    });
  };

  const handleToggle = () => {
    start(async () => {
      const r = await toggleUserActive(id);
      if (r?.error) alert(r.error);
    });
  };

  const handleReset = () => {
    const pw = prompt(`New password for @${username} (min 6 chars):`);
    if (!pw) return;
    start(async () => {
      const r = await resetUserPassword(id, pw);
      if (r?.error) alert(r.error);
      else alert("Password reset.");
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete @${username}? This cannot be undone.`)) return;
    start(async () => {
      const r = await deleteUser(id);
      if (r?.error) alert(r.error);
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        defaultValue={role}
        onChange={(e) => handleRole(e.target.value as Role)}
        className="select !py-1 !text-xs !w-auto"
        disabled={pending || isPrimary}
        title={isPrimary ? "The primary admin cannot be demoted" : "Change role"}
      >
        <option value="staff">staff</option>
        <option value="manager">manager</option>
        <option value="hr">hr</option>
        <option value="accounting">accounting</option>
        <option value="admin">admin</option>
      </select>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending || isPrimary}
        className="btn-secondary !py-1 !px-2 !text-xs"
        title={isPrimary ? "The primary admin cannot be disabled" : ""}
      >
        {isActive ? "Disable" : "Enable"}
      </button>
      <button
        type="button"
        onClick={handleReset}
        disabled={pending}
        className="btn-secondary !py-1 !px-2 !text-xs"
      >
        Reset PW
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending || isPrimary || isSelf}
        className="btn-danger !py-1 !px-2 !text-xs"
        title={
          isPrimary
            ? "Cannot delete primary admin"
            : isSelf
              ? "Cannot delete yourself"
              : ""
        }
      >
        Delete
      </button>
    </div>
  );
}
