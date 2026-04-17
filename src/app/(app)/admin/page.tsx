import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { fmtDate } from "@/lib/format";
import { redirect } from "next/navigation";
import NewUserForm from "./NewUserForm";
import UserActions from "./UserActions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  if (u?.role !== "admin") redirect("/");
  const myId = Number(u?.id);

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="User management" />

      <section className="card mb-6">
        <h3 className="font-bold mb-4">Add New User</h3>
        <NewUserForm />
      </section>

      <section className="card p-0 overflow-hidden">
        <h3 className="font-bold p-4">All Users ({users.length})</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Role / Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.isActive === 0 ? "opacity-50" : ""}>
                  <td className="font-semibold">
                    @{user.username}
                    {user.id === myId && (
                      <span className="ml-2 text-xs text-[#4a5678] font-normal">
                        (you)
                      </span>
                    )}
                  </td>
                  <td>{user.displayName}</td>
                  <td>
                    <span className="capitalize">{user.role}</span>
                    {user.isActive === 0 && (
                      <span className="ml-2 badge badge-cancelled">disabled</span>
                    )}
                  </td>
                  <td>{fmtDate(user.createdAt)}</td>
                  <td>
                    <UserActions
                      id={user.id}
                      username={user.username}
                      isActive={user.isActive === 1}
                      role={user.role as "admin" | "manager" | "staff" | "hr" | "accounting"}
                      isSelf={user.id === myId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
