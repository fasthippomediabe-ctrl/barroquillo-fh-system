import Image from "next/image";
import { loginAction } from "@/lib/auth-actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) redirect(sp.from || "/");
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--brand-bg)] p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo.png"
              alt="L.E. Barroquillo FH"
              width={90}
              height={90}
              className="rounded-full bg-white p-1 border border-[#e5ebf5]"
              priority
            />
            <h1 className="mt-3 text-xl font-bold text-center">L.E. Barroquillo FH</h1>
            <p className="text-sm text-[#4a5678]">Management System</p>
          </div>
          <form action={loginAction} className="flex flex-col gap-3">
            <input type="hidden" name="from" value={sp.from ?? "/"} />
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Username
              <input name="username" autoComplete="username" required className="input" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
              />
            </label>
            {sp.error && (
              <div className="text-sm text-[#c0392b] bg-[#fbdcdc] rounded-md px-3 py-2">
                Invalid username or password.
              </div>
            )}
            <button type="submit" className="btn-primary mt-2">
              Sign in
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-[#4a5678] mt-4">
          © {new Date().getFullYear()} L.E. Barroquillo Funeral Homes
        </p>
      </div>
    </div>
  );
}
