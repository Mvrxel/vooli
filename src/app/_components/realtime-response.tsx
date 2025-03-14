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

  // Extract metadata from the run
  const status = run?.metadata?.status as string | undefined;
  const products = run?.metadata?.products as
    | TavilySearchResponse[]
    | undefined;
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
        Loading...
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

  return (
    <div className="space-y-4 rounded-lg border p-4 shadow-sm">
      {/* Status indicator */}
      {status ? (
        <div className="flex items-center">
          <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
          <div className="text-sm font-medium capitalize">
            Status: {status.replace(/-/g, " ")}
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
          <div className="text-sm font-medium capitalize">
            Status: Starting agent...
          </div>
        </div>
      )}

      {/* Streamed response */}
      {streamedText && (
        <div className="rounded-md bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium">Response:</h3>
          <div className="prose prose-sm max-w-none">{streamedText}</div>
        </div>
      )}

      {/* Product list */}
      {productList.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Products Found:</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {productList.map((product, index) => (
              <a
                key={index}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border p-3 transition-colors hover:bg-gray-50"
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
      {/* <div>
        {displayText && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Answer:</h3>
            <MemoizedMarkdown content={displayText} id={run.id} />
          </div>
        )}
      </div> */}
      {/* Show run ID for debugging */}
      <div className="text-xs text-gray-400">Run ID: {run.id}</div>
    </div>
  );
}
