export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Avoid running auth on Next internals, static files, or API routes — otherwise the
     * browser may get an HTML redirect instead of CSS/JS chunks (unstyled page) or JSON.
     * Public UI: /login, /shared/* (auth still lives under /api/*; we skip all /api here).
     */
    "/((?!api/|_next/|favicon\\.ico|.*\\..*|login(?:$|/)|shared(?:$|/)).*)"
  ]
};
