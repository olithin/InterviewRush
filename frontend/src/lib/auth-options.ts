import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Stops Google OAuth redirect_uri_mismatch when .env has trailing space or slash.
(() => {
  const u = process.env.NEXTAUTH_URL;
  if (u) process.env.NEXTAUTH_URL = u.trim().replace(/\/$/, "");
})();

export const authOptions: NextAuthOptions = {
  // Explicit secret avoids silent dev-only warnings; production build fails without it.
  secret: process.env.NEXTAUTH_SECRET,
  // Logs SIGNIN_OAUTH_ERROR with the real exception in the terminal (e.g. discovery / network).
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  }
};
