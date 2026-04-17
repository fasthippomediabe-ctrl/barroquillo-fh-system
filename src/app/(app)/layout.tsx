import Sidebar from "@/components/Sidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // biome-ignore lint/suspicious/noExplicitAny: session augmented
  const u = session.user as any;
  return (
    <div className="flex min-h-screen">
      <Sidebar role={u.role ?? "staff"} displayName={u.name ?? u.username ?? "User"} />
      <main className="flex-1 p-6 md:p-8 max-w-[1400px] mx-auto w-full">{children}</main>
    </div>
  );
}
