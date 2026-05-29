import { NextResponse } from "next/server";

const GOOGLE_WELL_KNOWN = "https://accounts.google.com/.well-known/openid-configuration";

/**
 * Dev-only: report env presence and whether this server can reach Google (no secret values).
 * GET /api/dev/auth-check
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const googleId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const googleSecret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  const nextSecret = (process.env.NEXTAUTH_SECRET ?? "").trim();
  const nextUrlRaw = (process.env.NEXTAUTH_URL ?? "").trim().replace(/\/$/, "") || null;
  let javaScriptOrigin: string | null = null;
  let exactRedirectUri: string | null = null;
  const optionalOrigins: string[] = [];
  const optionalRedirectUris: string[] = [];
  if (nextUrlRaw) {
    try {
      const o = new URL(nextUrlRaw.startsWith("http") ? nextUrlRaw : `https://${nextUrlRaw}`);
      javaScriptOrigin = o.origin;
      exactRedirectUri = `${o.origin}/api/auth/callback/google`;
      // Register both 127.0.0.1 and localhost in Google if you ever switch (same port).
      if (o.hostname === "127.0.0.1" && o.port === "3000") {
        optionalOrigins.push("http://localhost:3000");
        optionalRedirectUris.push("http://localhost:3000/api/auth/callback/google");
      } else if (o.hostname === "localhost" && o.port === "3000") {
        optionalOrigins.push("http://127.0.0.1:3000");
        optionalRedirectUris.push("http://127.0.0.1:3000/api/auth/callback/google");
      }
    } catch {
      javaScriptOrigin = null;
      exactRedirectUri = null;
    }
  }

  let googleOpenId: { ok: boolean; status?: number; message?: string } = { ok: false };
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(GOOGLE_WELL_KNOWN, { signal: ac.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) {
      googleOpenId = { ok: false, status: res.status, message: `HTTP ${res.status}` };
    } else {
      googleOpenId = { ok: true, status: res.status };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    googleOpenId = { ok: false, message: msg };
  }

  return NextResponse.json({
    env: {
      GOOGLE_CLIENT_ID: googleId.length > 0,
      GOOGLE_CLIENT_SECRET: googleSecret.length > 0,
      NEXTAUTH_SECRET: nextSecret.length > 0,
      NEXTAUTH_URL: nextUrlRaw
    },
    /** Must match; optional entries avoid mismatch if the browser host differs. */
    googleCloudMustMatch: {
      authorizedJavaScriptOrigins: javaScriptOrigin
        ? [javaScriptOrigin, ...optionalOrigins.filter((x) => x !== javaScriptOrigin)]
        : [],
      authorizedRedirectUris: exactRedirectUri
        ? [exactRedirectUri, ...optionalRedirectUris.filter((x) => x !== exactRedirectUri)]
        : []
    },
    checks: {
      webApplicationHint:
        'OAuth client type: Web application. The two strings in googleCloudMustMatch must match your project exactly.'
    },
    googleOpenIdDiscovery: googleOpenId
  });
}
