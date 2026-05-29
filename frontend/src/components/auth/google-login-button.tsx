"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Chrome, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
type Props = {
  disabled?: boolean;
};

/**
 * Starts Google OAuth. next-auth's signIn() for OAuth always assigns window.location to
 * the provider URL and returns undefined — do not treat undefined as failure.
 */
export function GoogleLoginButton({ disabled = false }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (disabled || pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      await signIn("google", { callbackUrl: "/" });
      // OAuth: client navigates away; promise resolves with undefined — not an error.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={disabled || pending}
        onClick={() => void onClick()}
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Chrome className="h-5 w-5" aria-hidden />
        )}
        {pending ? "Connecting…" : "Continue with Google"}
      </Button>
      {error ? (
        <p
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm leading-snug text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
