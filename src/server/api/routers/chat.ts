import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type chatTask, type testTask } from "@/trigger/chat";
import { tasks } from "@trigger.dev/sdk/v3";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chat, message, product } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const chatRouter = createTRPCRouter({
  // Create a new chat with optional first user message
  createChat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message cannot be empty").optional(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create a new chat
        const [newChat] = await ctx.db
          .insert(chat)
          .values({
            userId: ctx.session.user.id,
            name: input.message,
          })
          .returning();

        if (!newChat) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create chat",
          });
        }

        // Add the first user message if provided
        let newMessage = null;
        if (input.message) {
          const [messageRecord] = await ctx.db
            .insert(message)
            .values({
              chatId: newChat.id,
              content: input.message,
              role: "user",
            })
            .returning();
          newMessage = messageRecord;
        }

        return {
          chat: newChat,
          message: newMessage,
        };
      } catch (error) {
        console.error("Error creating chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat",
        });
      }
    }),

  // Send a new message to an existing chat
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid("Invalid chat ID"),
        content: z.string().min(1, "Message cannot be empty"),
        role: z.enum(["user", "assistant"]).default("user"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [newMessage] = await ctx.db
          .insert(message)
          .values({
            chatId: input.chatId,
            content: input.content,
            role: input.role,
          })
          .returning();
        const handle = await tasks.trigger<typeof chatTask>("chat", {
          chatId: input.chatId,
          message: input.content,
        });

        return {
          runId: handle.id,
          token: handle.publicAccessToken,
          message: newMessage,
        };

        // // Verify that the chat belongs to the current user
        // const chatRecord = await ctx.db.query.chat.findFirst({
        //   where: and(
        //     eq(chat.id, input.chatId),
        //     eq(chat.userId, ctx.session.user.id),
        //   ),
        // });

        // if (!chatRecord) {
        //   throw new TRPCError({
        //     code: "NOT_FOUND",
        //     message: "Chat not found or you don't have access to it",
        //   });
        // }

        // // Add the new message
        // const [newMessage] = await ctx.db
        //   .insert(message)
        //   .values({
        //     chatId: input.chatId,
        //     content: input.content,
        //     role: input.role,
        //   })
        //   .returning();

        // // Update the chat's updatedAt timestamp
        // await ctx.db
        //   .update(chat)
        //   .set({ updatedAt: new Date() })
        //   .where(eq(chat.id, input.chatId));

        // return newMessage;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error sending message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
        });
      }
    }),

  // Get all messages for a specific chat with related products
  getChatMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid("Invalid chat ID"),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // First verify that the chat belongs to the current user
        const chatRecord = await ctx.db.query.chat.findFirst({
          where: and(
            eq(chat.id, input.chatId),
            eq(chat.userId, ctx.session.user.id),
          ),
        });

        if (!chatRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat not found or you don't have access to it",
          });
        }

        // Get all messages for the chat
        const messages = await ctx.db.query.message.findMany({
          where: eq(message.chatId, input.chatId),
          orderBy: (message, { asc }) => [asc(message.createdAt)],
        });

        // Separately fetch products for each message to avoid relation issues
        const messagesWithProducts = await Promise.all(
          messages.map(async (msg) => {
            try {
              const products = await ctx.db.query.product.findMany({
                where: eq(product.messageId, msg.id),
              });

              return {
                ...msg,
                products: products.length > 0 ? products : [],
              };
            } catch (error) {
              console.error(
                `Error fetching products for message ${msg.id}:`,
                error,
              );
              return {
                ...msg,
                products: [],
              };
            }
          }),
        );

        return {
          chat: chatRecord,
          messages: messagesWithProducts,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching chat messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch chat messages",
        });
      }
    }),
});
