"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EnhancedTextarea from "./enhanced-textarea";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Send } from "lucide-react";

export function InitChat() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [message, setMessage] = useState("");

  // Create chat mutation
  const createChatMutation = api.chat.createChat.useMutation({
    onSuccess: (data) => {
      // Navigate to the new chat page with the initial message as a URL parameter
      if (message.trim()) {
        router.push(
          `/chat/${data.chat.id}?init_msg=${encodeURIComponent(message.trim())}`,
        );
      } else {
        router.push(`/chat/${data.chat.id}`);
      }
    },
    onError: (error) => {
      console.error("Error creating chat:", error);
      setIsCreatingChat(false);
    },
  });

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  const handleCreateChat = async () => {
    if (!message.trim() || isCreatingChat) return;

    try {
      setIsCreatingChat(true);

      // Create a new chat without an initial message
      await createChatMutation.mutateAsync({
        name: `Chat ${new Date().toLocaleString()}`, // Default name based on date/time
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      setIsCreatingChat(false);
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

          <EnhancedTextarea
            placeholder="What can I find for you?"
            initialValue={message}
            onValueChange={setMessage}
            onButtonClick={handleCreateChat}
            buttonIcon={
              isCreatingChat ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )
            }
          />

          {isCreatingChat && (
            <p className="text-center text-sm text-gray-500">
              Creating your chat...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
