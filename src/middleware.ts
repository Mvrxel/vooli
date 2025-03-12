import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const isAuthPage = request.nextUrl.pathname === "/sign-in";

  // If the user is on the auth page and is already logged in, redirect to the home page
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: ["/sign-in"],
};
