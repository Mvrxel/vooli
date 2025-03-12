"use client";

import EnhancedTextarea from "./enhanced-textarea";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function InitChat() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#F8F8F8] p-6">
      {/* Sign Out Button */}
      <div className="absolute right-4 top-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>

      <div className="w-full max-w-xl">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-lg text-gray-500">Welcome back!</p>
            <h2 className="text-2xl font-medium text-gray-800">
              How can we help you find products?
            </h2>
          </div>

          <EnhancedTextarea />
        </div>
      </div>
    </main>
  );
}
