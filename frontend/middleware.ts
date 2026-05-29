export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Include "/" explicitly — the catch-all below does not match the root path.
     * Avoid auth on Next internals, static files, or API routes.
     * Public UI: /login, /shared/* (auth lives under /api/*; we skip all /api here).
     */
    "/",
    "/((?!api/|_next/|favicon\\.ico|.*\\..*|login(?:$|/)|shared(?:$|/)).+)"
  ]
};
