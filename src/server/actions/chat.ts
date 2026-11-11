"use server";

import { streamText } from "ai";
import { auth } from "@/auth";
import { chatModel } from "@/server/ai/client";

import {
  addMessage,
  createConversation,
  getContextForQuery,
  getConversationWithMessages,
} from "@/server/services/chats";
import { getOrganizationBySlug } from "@/server/services/organizations";

export async function sendChatMessage({
  orgSlug,
  conversationId,
  message,
}: {
  orgSlug: string;
  conversationId?: string;
  message: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const org = await getOrganizationBySlug(orgSlug);
  if (!org) {
    throw new Error("Organization not found");
  }

  // 1. Get or create conversation
  let activeConversationId = conversationId;
  if (!activeConversationId) {
    const newConv = await createConversation({
      organizationId: org.id,
      userId: session.user.id,
      title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
    });
    activeConversationId = newConv.id;
  } else {
    const existing = await getConversationWithMessages({
      conversationId: activeConversationId,
      organizationId: org.id,
      userId: session.user.id,
    });
    if (!existing) {
      throw new Error("Conversation not found");
    }
  }

  // 2. Save user message
  await addMessage({
    conversationId: activeConversationId,
    role: "user",
    content: message,
  });

  // 3. Retrieve relevant context via RAG
  const similarChunks = await getContextForQuery({
    organizationId: org.id,
    query: message,
  });

  const contextText = similarChunks
    .map(
      (chunk, idx) =>
        `[Source ${idx + 1}: ${chunk.documentName} (Chunk ${chunk.chunkIndex})]\n${chunk.content}`,
    )
    .join("\n\n");

  const systemPrompt = `You are Recall, a helpful AI knowledge workspace assistant. Answer the user's question accurately based ONLY on the provided context passages from the organization's documents. If the answer cannot be found in the context, state that clearly. Always cite your sources using [Source X] notation.\n\nContext:\n${contextText || "No relevant documents found."}`;

  // 4. Generate AI response using Vercel AI SDK streamText
  const result = await streamText({
    model: chatModel,
    system: systemPrompt,
    prompt: message,
  });

  // Accumulate response and save assistant message
  let fullResponse = "";
  for await (const textPart of result.textStream) {
    fullResponse += textPart;
  }

  // Save assistant message with sources
  await addMessage({
    conversationId: activeConversationId!,
    role: "assistant",
    content: fullResponse,
    sources: similarChunks,
  });

  return {
    conversationId: activeConversationId,
    output: fullResponse,
  };
}