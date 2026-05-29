/** User-facing copy for NextAuth `error` query param or `signIn` response. */

export function mapNextAuthError(error: string | undefined): string {
  if (!error) {
    return "Sign-in could not complete. Check Network for /api/auth/* and your .env.local (see .env.example).";
  }
  if (error === "Configuration") {
    return (
      "Server configuration: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_SECRET in frontend/.env.local, " +
      "restart the dev server, and add the redirect URI in Google Cloud Console (see .env.example). " +
      "NEXTAUTH_URL must match the origin you use in the browser (e.g. http://localhost:3000, not 127.0.0.1)."
    );
  }
  if (error === "AccessDenied") {
    return "Access was denied. You can try again or pick another Google account.";
  }
  if (error === "Verification") {
    return "The sign-in link expired or was already used. Try again from this page.";
  }
  if (error === "OAuthSignin" || error === "OAuthCreateAccount") {
    return (
      "Google sign-in failed before the redirect (usually bad/missing .env or blocked network). " +
      "Use a Web app OAuth client; in Google Cloud set redirect to http://localhost:3000/api/auth/callback/google and origin " +
      "http://localhost:3000. In dev, open /api/dev/auth-check — it shows which env vars are set and if this machine can reach Google."
    );
  }
  if (error === "OAuthCallback") {
    return (
      "Google returned, but the token step failed. Check GOOGLE_CLIENT_SECRET and redirect URI; " +
      "see server logs. In dev: /api/dev/auth-check and terminal [next-auth] errors."
    );
  }
  if (error === "Callback" || error === "Signin") {
    return "Sign-in failed during the provider callback. Try again; if it persists, check server logs.";
  }
  if (error === "OAuthAccountNotLinked") {
    return "This email is already linked to another sign-in method.";
  }
  if (error === "SessionRequired") {
    return "You need to sign in to access that page.";
  }
  return `Sign-in error: ${error}`;
}
