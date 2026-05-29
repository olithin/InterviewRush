"use client";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { PageTitle } from "@/components/layout/page-title";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type LoginPageViewProps = {
  /** Shown when NextAuth redirects back with `?error=` (e.g. OAuth, Configuration). */
  urlError?: string | null;
};

/**
 * Login body: same Card + PageTitle language as Dashboard / coach pages (clay UI).
 */
export function LoginPageView({ urlError }: LoginPageViewProps) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <PageTitle
        title="Welcome back"
        subtitle="Sign in with Google to sync your personal answers, notes, and progress across devices."
      />
      {urlError ? (
        <p
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm leading-snug text-destructive"
          role="alert"
        >
          {urlError}
        </p>
      ) : null}
      <Card className="clay-surface overflow-hidden rounded-[2rem] border border-white/65 bg-gradient-to-b from-[hsl(48,48%,99.2%)] via-[hsl(42,38%,98%)] to-[hsl(35,30%,90%)] shadow-clay ring-1 ring-inset ring-amber-50/50">
        <CardHeader className="space-y-1 pb-2">
          <p className="text-sm text-muted-foreground">
            One tap — we only use your account to know it’s you. No posting on your behalf.
          </p>
        </CardHeader>
        <CardContent className="pb-8 pt-2">
          <GoogleLoginButton />
        </CardContent>
      </Card>
    </div>
  );
}
