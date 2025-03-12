import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
export default async function Home() {
  const session = await auth();
  return (
    <HydrateClient>
      {session ? (
        // Content for authenticated users
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <div className="w-full rounded-lg bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Welcome, {session.user?.name}!
            </h2>
            <p className="mb-4">
              You are now signed in with your Google account.
            </p>
            <p className="mb-6 text-sm opacity-80">
              Email: {session.user?.email}
            </p>

            <div className="flex items-center justify-between">
              <Link
                href="/api/auth/signout"
                className="rounded-full bg-white/10 px-6 py-2 font-semibold no-underline transition hover:bg-white/20"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // Content for unauthenticated users
        <div>
          <div>
            <h2 className="mb-4 text-2xl font-bold">Get Started</h2>
            <p className="mb-6">
              Sign in with your Google account to access all features.
            </p>
            <Link
              href="/sign-in"
              className="inline-block rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </HydrateClient>
  );
}
