import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { conversations, messages } from "@/server/db/schema";
import { searchSimilarChunks } from "@/server/services/rag";

export async function createConversation({
  organizationId,
  userId,
  title,
}: {
  organizationId: string;
  userId: string;
  title?: string;
}) {
  const [conversation] = await db
    .insert(conversations)
    .values({
      organizationId,
      userId,
      title: title ?? "New conversation",
    })
    .returning();

  return conversation;
}

export async function getConversationsForUser({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.userId, userId),
      ),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationWithMessages({
  conversationId,
  organizationId,
  userId,
}: {
  conversationId: string;
  organizationId: string;
  userId: string;
}) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.organizationId, organizationId),
        eq(conversations.userId, userId),
      ),
    );

  if (!conversation) return null;

  const msgList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return {
    ...conversation,
    messages: msgList,
  };
}

export async function addMessage({
  conversationId,
  role,
  content,
  sources,
}: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: unknown;
}) {
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      sources: sources ?? null,
    })
    .returning();

  return message;
}

export async function getContextForQuery({
  organizationId,
  query,
}: {
  organizationId: string;
  query: string;
}) {
  const similarChunks = await searchSimilarChunks({
    organizationId,
    query,
    limit: 5,
    similarityThreshold: 0.25,
  });

  return similarChunks;
}
