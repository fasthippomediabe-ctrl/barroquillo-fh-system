"use server";
import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/");
  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: from || "/",
    });
  } catch (err) {
    if ((err as Error).message?.includes("NEXT_REDIRECT")) throw err;
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
