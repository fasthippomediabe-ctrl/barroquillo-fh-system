import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// The Streamlit app stored SHA-256 hex of the raw password.
function legacySha256(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verify(password: string, hash: string): boolean {
  if (hash.startsWith("$2")) return bcrypt.compareSync(password, hash);
  return legacySha256(password) === hash;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const username = String(creds?.username ?? "").trim();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || user.isActive !== 1) return null;
        if (!verify(password, user.passwordHash)) return null;
        return {
          id: String(user.id),
          name: user.displayName,
          email: `${user.username}@local`,
          role: user.role,
          username: user.username,
          // biome-ignore lint/suspicious/noExplicitAny: augment user
        } as any;
      },
    }),
  ],
});
