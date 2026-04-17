import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { fmtDate } from "@/lib/format";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  // biome-ignore lint/suspicious/noExplicitAny: session
  const u = session?.user as any;
  const me = await prisma.user.findUnique({ where: { id: Number(u?.id) } });
  if (!me) return null;

  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-3">Account</h3>
          <Info label="Username">{me.username}</Info>
          <Info label="Display Name">{me.displayName}</Info>
          <Info label="Role">
            <span className="capitalize">{me.role}</span>
          </Info>
          <Info label="Member Since">{fmtDate(me.createdAt)}</Info>
        </div>
        <div className="card">
          <h3 className="font-bold mb-3">Change Password</h3>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-[#e5ebf5] last:border-0 text-sm">
      <div className="w-36 text-[#4a5678] shrink-0">{label}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
