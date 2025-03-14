import { schemaTask, metadata, queue } from "@trigger.dev/sdk/v3";
import { openai } from "@ai-sdk/openai";
import { generateObject, streamText, type TextStreamPart } from "ai";
import { tavily, type TavilySearchResponse } from "@tavily/core";
import { db } from "@/server/db";
import { message, product } from "@/server/db/schema";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";

export type STREAMS = {
  response: TextStreamPart<{}>;
};

export const productQueue = queue({
  name: "product",
  concurrencyLimit: 10,
});

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
        You are a helpful assistant for a shopping assistant. You will be given a list of product search results and you will need to summarize the search results into a single search result. Response with language that user used to ask question.

        User Message:
        ${payload.message}

        Product reviews:
        ${results.map((result) => result.answer).join("\n")}    

        Product Search Results:
        ${productSearchResultsData.map((result) => result.results.map((r) => `Title: ${r.title}\nAnswer: ${r.url}`).join("\n")).join("\n")}    
        `,
      });
      metadata.set(
        "status",
        "collecting-products-and-generating-perfect-response",
      );
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
            await getProductInfoTask.batchTriggerAndWait(
              productSearchResultsData.flatMap((result) =>
                result.results.map((r) => ({
                  payload: {
                    messageId,
                    url: r.url,
                  },
                })),
              ),
            );
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

export const getProductInfoTask = schemaTask({
  id: "get-product-info",
  queue: productQueue,
  schema: z.object({
    messageId: z.string(),
    url: z.string(),
  }),
  run: async (payload) => {
    const { url } = payload;
    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAFT_API_KEY,
    });

    const scrape = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
    });

    if (!scrape.success) {
      console.error(`Failed to scrape: ${scrape.error}`);
      return { error: scrape.error };
    }

    const { object: scrapeResult } = await generateObject({
      model: openai("o3-mini"),
      prompt: `Extract the product information from the following markdown: ${scrape.markdown}`,
      schema: z.object({
        product_name: z.string().describe("The name of the product"),
        product_description: z
          .string()
          .describe("The description of the product"),
        product_price: z
          .string()
          .describe("The price of the product with currency"),
        product_image_url: z.string().describe("The image url of the product"),
      }),
    });

    // const scrapeResult = await firecrawl.extract([url], {
    //   prompt: "Extract the product information from store page",
    //   schema: z.object({
    //     product_name: z.string(),
    //     product_description: z.string(),
    //     product_price: z.number(),
    //     product_image_url: z.string(),
    //   }),
    // });

    try {
      // Check if scrapeResult has the expected properties
      if (
        "product_name" in scrapeResult &&
        "product_description" in scrapeResult &&
        "product_price" in scrapeResult &&
        "product_image_url" in scrapeResult
      ) {
        // Type assertion to help TypeScript understand the structure
        const typedResult = scrapeResult as {
          product_name: string;
          product_description: string;
          product_price: string;
          product_image_url: string;
        };

        await db.insert(product).values({
          messageId: payload.messageId,
          name: typedResult.product_name,
          description: typedResult.product_description,
          price: typedResult.product_price,
          imageUrl: typedResult.product_image_url,
          url: url,
        });
      } else {
        console.error("Invalid scrape result format:", scrapeResult);
      }
    } catch (error) {
      console.error("Failed to insert products into database:", error);
    }
    return scrapeResult;
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

export const testTask = schemaTask({
  id: "test",
  schema: z.object({
    url: z.string(),
  }),
  run: async (payload) => {
    const { url } = payload;
    const app = new FirecrawlApp({
      apiKey: process.env.FIRECRAFT_API_KEY,
    });
    const schema = z.object({
      company_mission: z.string(),
      supports_sso: z.boolean(),
      is_open_source: z.boolean(),
      is_in_yc: z.boolean(),
    });

    const scrapeResult = await app.extract(["https://firecrawl.dev/"], {
      prompt:
        "Extract the company mission, whether it supports SSO, whether it is open source, and whether it is in Y Combinator from the page.",
      schema: schema,
    });

    if (!scrapeResult.success) {
      console.error(`Failed to scrape: ${scrapeResult.error}`);
      return { error: scrapeResult.error };
    }

    console.log(scrapeResult.data);
    return scrapeResult;
  },
});
