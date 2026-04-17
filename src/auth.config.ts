import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // biome-ignore lint/suspicious/noExplicitAny: augment token
        const u = user as any;
        token.role = u.role;
        token.username = u.username;
        token.uid = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // biome-ignore lint/suspicious/noExplicitAny: augment session
        const s = session.user as any;
        s.role = token.role;
        s.username = token.username;
        s.id = token.uid;
      }
      return session;
    },
  },
};
