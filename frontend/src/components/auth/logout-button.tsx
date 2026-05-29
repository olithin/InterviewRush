"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * Header auth: Sign in when anonymous, Logout when signed in (Google via /login).
 */
export function LogoutButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="inline-flex h-9 min-w-[5.5rem] items-center justify-center rounded-full border border-transparent text-xs text-muted-foreground">
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Button type="button" variant="secondary" size="sm" className="shrink-0" asChild>
        <Link href="/login">
          <LogIn className="h-4 w-4" aria-hidden />
          Sign in
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      className="shrink-0"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Logout
    </Button>
  );
}
