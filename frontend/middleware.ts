export { default } from "next-auth/middleware";

export const config = {
  // Official NextAuth matcher — must exclude _next/static or CSS/JS chunks break (unstyled page).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
