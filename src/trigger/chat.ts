import { schemaTask, metadata } from "@trigger.dev/sdk/v3";
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  generateObject,
  streamText,
  type TextStreamPart,
} from "ai";
import { tavily, type TavilySearchResponse } from "@tavily/core";
import { drizzle } from "drizzle-orm/postgres-js";
import { db } from "@/server/db";
import { message, product } from "@/server/db/schema";
import { z } from "zod";

export type STREAMS = {
  response: TextStreamPart<{}>;
};

export const chatTask = schemaTask({
  id: "chat",
  schema: z.object({
    chatId: z.string(),
    message: z.string(),
  }),
  run: async (payload) => {
    metadata.set("status", "understanding-message");
    const understand = await understendMessageTask.triggerAndWait({
      message: payload.message,
    });
    if (!understand.ok) {
      return "I'm sorry, I don't understand your message.";
    }
    const { intentIsProductReview, queries } = understand.output;
    if (intentIsProductReview && queries.length > 0) {
      metadata.set("status", "searching-product-reviews");
      const searchResults = await searchProductReviewsTask.triggerAndWait({
        queries,
      });
      if (!searchResults.ok) {
        return "I'm sorry, I couldn't find any product reviews.";
      }
      metadata.set("status", "getting-product-queries");
      const { results } = searchResults.output;
      const productQueries = await getProductQueriesTask.triggerAndWait({
        reviews: results.map((result) => result.answer) as string[],
      });
      if (!productQueries.ok) {
        return "I'm sorry, I couldn't find any product queries.";
      }
      metadata.set("status", "searching-product");
      const { queries: productQueriesData } = productQueries.output;
      const productSearchResults = await searchProductTask.triggerAndWait({
        queries: productQueriesData,
      });
      if (!productSearchResults.ok) {
        return "I'm sorry, I couldn't find any product search results.";
      }

      metadata.set("status", "generating-response");
      const { results: productSearchResultsData } = productSearchResults.output;
      console.log(
        productSearchResultsData
          .map((result) =>
            result.results
              .map((r) => `Title: ${r.title}\nAnswer: ${r.url}`)
              .join("\n"),
          )
          .join("\n"),
      );
      const result = streamText({
        model: openai("gpt-4o-mini"),
        prompt: `
        You are a helpful assistant for a shopping assistant. You will be given a list of product search results and you will need to summarize the search results into a single search result.

        User Message:
        ${payload.message}

        Product reviews:
        ${results.map((result) => result.answer).join("\n")}    

        Product Search Results:
        ${productSearchResultsData.map((result) => result.results.map((r) => `Title: ${r.title}\nAnswer: ${r.url}`).join("\n")).join("\n")}    
        `,
      });
      metadata.set("status", "sending-response");
      metadata.set("products", productSearchResultsData);
      await metadata.stream("response", result.fullStream);
      const text = await result.text;
      try {
        const newMessage = await db
          .insert(message)
          .values({
            chatId: payload.chatId,
            content: text,
            role: "assistant",
          })
          .returning();

        if (newMessage && newMessage.length > 0) {
          const messageId = newMessage[0]?.id;
          if (!messageId) {
            return "I'm sorry, I couldn't send the response.";
          }
          try {
            // Flatten the nested arrays with flatMap
            const productEntries = productSearchResultsData.flatMap((result) =>
              result.results.map((r) => ({
                name: r.title,
                url: r.url,
                description: "",
                price: 0,
                imageUrl: "",
                messageId: messageId,
              })),
            );

            if (productEntries.length > 0) {
              await db.insert(product).values(productEntries);
            }
          } catch (error) {
            console.error("Failed to insert products into database:", error);
          }
        }
      } catch (error) {
        console.error("Failed to insert message into database:", error);
      }

      return {
        productSearchResultsData,
      };
    }
    return "I'm sorry, I don't understand your message.";
  },
});

export const understendMessageTask = schemaTask({
  id: "understend-message",
  schema: z.object({
    message: z.string(),
  }),
  run: async (payload) => {
    const { message } = payload;
    const { object } = await generateObject({
      model: openai("o3-mini"),
      system:
        "You are a helpful assistant for a shopping assistant. You will be given a message from the user and you will need to understand the user's intent and return a JSON object with the intent and search queries for product reviews.",
      prompt: message,
      schema: z.object({
        intentIsProductReview: z
          .boolean()
          .describe(
            "Whether the user's intent is to search for product reviews.",
          ),
        queries: z
          .array(z.string())
          .describe("The search queries for product reviews."),
      }),
    });
    console.log(object);
    return object;
  },
});

export const searchProductReviewsTask = schemaTask({
  id: "search-product-reviews",
  schema: z.object({
    queries: z.array(z.string()),
  }),
  run: async (payload) => {
    const { queries } = payload;
    const tvly = tavily();
    const allResults: TavilySearchResponse[] = [];
    for (const query of queries) {
      const searchResult = await tvly.search(query, {
        max_results: 1,
        includeAnswer: true,
      });
      allResults.push(searchResult);
    }
    console.log(allResults);
    return { results: allResults };
  },
});

export const getProductQueriesTask = schemaTask({
  id: "get-product-queries",
  schema: z.object({
    reviews: z.array(z.string()),
  }),
  run: async (payload) => {
    const { reviews } = payload;
    const { object } = await generateObject({
      model: openai("o3-mini"),
      prompt: `
        You are a helpful assistant for a shopping assistant. You will be given a list of product reviews and you will need to extract the queries from the reviews that will be used to search for ecommerce stores with this product.
        Product Reviews:
        ${reviews.map((review) => review).join("\n")}    
      `,
      schema: z.object({
        queries: z
          .array(z.string())
          .describe(
            "The search queries for ecommerce stores with the product.",
          ),
      }),
    });
    return object;
  },
});

export const searchProductTask = schemaTask({
  id: "search-product",
  schema: z.object({
    queries: z.array(z.string()),
  }),
  run: async (payload) => {
    const { queries } = payload;
    const tvly = tavily();
    const allResults: TavilySearchResponse[] = [];
    for (const query of queries) {
      const searchResult = await tvly.search(query, {
        max_results: 1,
      });
      allResults.push(searchResult);
    }
    console.log(allResults);
    return { results: allResults };
  },
});

export const testDrizzle = schemaTask({
  id: "test-drizzle",
  schema: z.object({
    message: z.string(),
  }),
  run: async (payload) => {
    const result = await db.select().from(message);
    console.log(result);
    return result;
  },
});
