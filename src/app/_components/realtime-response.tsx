"use client"; // This is needed for Next.js App Router or other RSC frameworks

import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import { useEffect, useState } from "react";
import { type TavilySearchResponse } from "@tavily/core";
import { type STREAMS, type chatTask } from "@/trigger/chat";
import { MemoizedMarkdown } from "./markdown-text";
type Product = {
  title: string;
  url: string;
};

type Source = {
  url: string;
  answer?: string;
  title?: string;
  type?: string;
};

export function RealtimeResponse({
  runId,
  publicAccessToken,
  onComplete,
}: {
  runId: string;
  publicAccessToken: string;
  onComplete: () => void;
}) {
  const { run, error, streams } = useRealtimeRunWithStreams<
    typeof chatTask,
    STREAMS
  >(runId, {
    accessToken: publicAccessToken,
  });
  const displayText =
    streams.response
      ?.filter((part) => part.type === "text-delta")
      .map((part) => part.textDelta)
      .join("") ?? "";
  const [streamedText, setStreamedText] = useState<string>("");
  const [loadingDots, setLoadingDots] = useState<string>(".");

  // Extract metadata from the run
  const status = run?.metadata?.status as string | undefined;
  const products = run?.metadata?.products as
    | TavilySearchResponse[]
    | undefined;
  const sources = run?.metadata?.sources as Source[] | undefined;
  const stream = run?.metadata?.stream as string[] | undefined;

  // Update streamed text when new chunks arrive
  useEffect(() => {
    if (stream && stream.length > 0) {
      setStreamedText(stream.join(""));
    }
  }, [stream]);

  useEffect(() => {
    if (run?.status === "COMPLETED") {
      onComplete();
    }
  }, [run?.status, onComplete]);

  // Animate loading dots
  useEffect(() => {
    if (run?.status !== "COMPLETED") {
      const interval = setInterval(() => {
        setLoadingDots((prev) => (prev.length >= 3 ? "." : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [run?.status]);

  if (error)
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">
        Error: {error.message}
      </div>
    );
  if (!run)
    return (
      <div className="flex items-center justify-center p-4">
        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>{" "}
        Loading{loadingDots}
      </div>
    );

  // Extract product information from search results
  const productList: Product[] = [];
  if (products) {
    products.forEach((searchResponse) => {
      searchResponse.results?.forEach((result) => {
        productList.push({
          title: result.title,
          url: result.url,
        });
      });
    });
  }

  // Extract sources information
  const sourcesList: Source[] = [];
  if (sources) {
    if (Array.isArray(sources)) {
      sources.forEach((source) => {
        if (typeof source === "object" && source !== null) {
          sourcesList.push({
            url: source.url ?? "",
            answer: source.answer,
            title: source.title,
            type: "review",
          });
        }
      });
    }
  }

  // Format status for display
  const formattedStatus = status ? status.replace(/-/g, " ") : "Starting agent";
  const statusEmoji = getStatusEmoji(status);

  return (
    <div className="space-y-4 rounded-lg border p-4 shadow-sm">
      {/* Status indicator with animation */}
      <div className="flex items-center">
        <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        <div className="text-sm font-medium capitalize">
          {statusEmoji} Status: {formattedStatus}
          {run?.status !== "COMPLETED" ? loadingDots : ""}
        </div>
      </div>

      {/* Progress tracker */}
      {status && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: getProgressPercentage(status) }}
            ></div>
          </div>
        </div>
      )}

      {/* Sources list */}
      {sourcesList.length > 0 && (
        <div className="rounded-md bg-blue-50 p-4 transition-opacity duration-300">
          <h3 className="mb-2 flex items-center text-sm font-medium">
            <span className="mr-2">📚</span> Sources Found:
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sourcesList.map((source, index) => (
              <div
                key={index}
                className="rounded-md border border-blue-100 bg-white p-3 shadow-sm transition-all hover:shadow-md"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {source.title ?? "Review Source"}
                </a>
                {source.answer && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                    {source.answer}
                  </p>
                )}
                <div className="mt-1 truncate text-xs text-gray-400">
                  {source.url}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streamed response */}
      {streamedText && (
        <div className="rounded-md bg-gray-50 p-4 shadow-inner">
          <h3 className="mb-2 flex items-center text-sm font-medium">
            <span className="mr-2">💬</span> Response:
          </h3>
          <div className="prose prose-sm max-w-none">{streamedText}</div>
        </div>
      )}

      {/* Product list with improved styling */}
      {productList.length > 0 && (
        <div className="rounded-md bg-green-50 p-4 transition-opacity duration-300">
          <h3 className="mb-2 flex items-center text-sm font-medium">
            <span className="mr-2">🛍️</span> Products Found:
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {productList.map((product, index) => (
              <a
                key={index}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-green-100 bg-white p-3 shadow-sm transition-all hover:shadow-md"
              >
                <div className="text-sm font-medium text-blue-600 hover:underline">
                  {product.title}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {product.url}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Show run ID for debugging */}
      <div className="text-xs text-gray-400">Run ID: {run.id}</div>
    </div>
  );
}

// Helper function to get emoji based on status
function getStatusEmoji(status?: string): string {
  if (!status) return "🔍";

  switch (status) {
    case "understanding-message":
      return "🧠";
    case "searching-product-reviews":
      return "🔍";
    case "getting-product-queries":
      return "📝";
    case "searching-product":
      return "🛍️";
    case "generating-response":
      return "✍️";
    case "collecting-products-and-generating-perfect-response":
      return "🎯";
    default:
      return "⚙️";
  }
}

// Helper function to get progress percentage based on status
function getProgressPercentage(status: string): string {
  const stages = [
    "understanding-message",
    "searching-product-reviews",
    "getting-product-queries",
    "searching-product",
    "generating-response",
    "collecting-products-and-generating-perfect-response",
  ];

  const index = stages.indexOf(status);
  if (index === -1) return "10%";

  return `${Math.min(100, Math.round(((index + 1) / stages.length) * 100))}%`;
}
