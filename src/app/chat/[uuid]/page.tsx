"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import EnhancedTextarea from "@/app/_components/enhanced-textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { RealtimeResponse } from "../../_components/realtime-response";
import { AssistantMessage } from "@/app/_components/assistant-message";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  store_name: string | null;
  url: string;
  imageUrl: string;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  products?: Product[] | null;
}

export default function ChatPage() {
  const params = useParams<{ uuid: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = params.uuid;
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [triggerRunId, setTriggerRunId] = useState<string | null>(null);
  const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
    null,
  );
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const utils = api.useUtils();

  // Fetch chat messages
  const { data, isLoading, error, refetch } = api.chat.getChatMessages.useQuery(
    { chatId },
    {
      enabled: !!chatId,
      refetchOnWindowFocus: false,
      retry: 1, // Only retry once to avoid excessive error messages
    },
  );

  function onComplete() {
    void utils.chat.getChatMessages.invalidate({ chatId });
    setTriggerRunId(null);
    setPublicAccessToken(null);
    setNewMessage("");
    setIsSending(false);
  }

  // Log errors to console
  useEffect(() => {
    if (error) {
      console.error("Error fetching chat messages:", error);
    }
  }, [error]);

  // Send message mutation
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: (result) => {
      setTriggerRunId(result.runId ?? null);
      setPublicAccessToken(result.token ?? null);
      void refetch();
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setIsSending(false);
    },
  });

  // Check for init_msg parameter and send initial message if chat is empty
  useEffect(() => {
    if (chatId && !initialMessageSent && !isLoading && data) {
      // Check if chat is empty (no messages)
      if (data.messages.length === 0) {
        // Check for init_msg parameter
        const initMsg = searchParams.get("init_msg");
        if (initMsg) {
          // Send the initial message
          setIsSending(true);
          void sendMessageMutation.mutateAsync({
            chatId,
            content: initMsg,
            role: "user",
          });

          // Remove the init_msg parameter from URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);

          setInitialMessageSent(true);
        }
      } else {
        // Chat already has messages, mark as initialized
        setInitialMessageSent(true);
      }
    }
  }, [
    chatId,
    data,
    initialMessageSent,
    isLoading,
    searchParams,
    sendMessageMutation,
  ]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);

      // Send the user message
      await sendMessageMutation.mutateAsync({
        chatId,
        content: newMessage,
        role: "user",
      });

      // Clear the input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F8F8] p-6">
        <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-medium text-red-600">Error</h2>
          <p className="text-gray-600">
            {error instanceof Error
              ? error.message
              : "Failed to load chat messages"}
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-[#F8F8F8]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-100/30 bg-white/60 px-4 py-3 shadow-sm shadow-gray-100/20 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100/70 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                {data?.chat.name ?? "Chat"}
              </h1>
              <p className="text-xs text-gray-500">
                {new Date(
                  data?.chat.createdAt ?? Date.now(),
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-gray-600 hover:bg-gray-100/70 hover:text-gray-900"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-6 pb-24">
          {data?.messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl bg-black p-4 text-white">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ) : (
                <div className="w-full max-w-[90%]">
                  <AssistantMessage
                    id={message.id}
                    content={message.content}
                    products={message.products}
                  />
                </div>
              )}
            </div>
          ))}

          {triggerRunId && publicAccessToken && (
            <RealtimeResponse
              runId={triggerRunId}
              publicAccessToken={publicAccessToken}
              onComplete={onComplete}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F8F8F8] p-4">
        <div className="mx-auto max-w-3xl">
          <EnhancedTextarea
            placeholder="Ask about products..."
            initialValue={newMessage}
            onValueChange={setNewMessage}
            onButtonClick={handleSendMessage}
            isDisabled={isSending}
            buttonIcon={
              isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )
            }
          />
        </div>
      </div>
    </main>
  );
}
