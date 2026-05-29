import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LoginPageView } from "@/components/auth/login-page-view";
import { mapNextAuthError } from "@/lib/auth-error-messages";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(s: string | string[] | undefined): string | undefined {
  if (Array.isArray(s)) return s[0];
  return s;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/");
  }

  const sp = await searchParams;
  const err = first(sp.error);
  const urlError = err ? mapNextAuthError(err) : null;

  return (
    <div className="flex min-h-[min(70vh,calc(100dvh-12rem))] w-full flex-col items-center justify-center py-4">
      <LoginPageView urlError={urlError} />
    </div>
  );
}
