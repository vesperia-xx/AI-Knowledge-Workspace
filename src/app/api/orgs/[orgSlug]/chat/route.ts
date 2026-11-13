import { streamText } from "ai";

import { chatModel } from "@/server/ai/client";
import { requireOrganization } from "@/server/auth/organization";
import { getCurrentUser } from "@/server/auth/session";
import {
  addMessage,
  createConversation,
} from "@/server/services/chats";
import { logger } from "@/server/lib/logger";
import { searchSimilarChunks } from "@/server/services/rag";

/** Streaming answers regularly outlive the default function budget. */
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const org = await requireOrganization(orgSlug);

  const body = await request.json();
  const { messages, conversationId } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    conversationId?: string;
  };

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || latestMessage.role !== "user") {
    return new Response("Invalid message format", { status: 400 });
  }

  // 1. Get or create conversation
  let activeConversationId = conversationId;
  if (!activeConversationId) {
    const newConv = await createConversation({
      organizationId: org.organization.id,
      userId: user.id,
      title: latestMessage.content.slice(0, 30) + (latestMessage.content.length > 30 ? "..." : ""),
    });
    activeConversationId = newConv.id;
  }

  // Save user message
  await addMessage({
    conversationId: activeConversationId,
    role: "user",
    content: latestMessage.content,
  });

  // 2. Retrieve the passages this question should be answered from. A failure
  // here must not take the chat down: answering without context is worse, but
  // an empty 500 is worse still.
  let context = "";
  let sources: Array<{
    index: number;
    documentName: string;
    chunkIndex: number;
    similarity: number;
  }> = [];

  try {
    const matches = await searchSimilarChunks({
      organizationId: org.organization.id,
      query: latestMessage.content,
      limit: 4,
    });

    context = matches
      .map(
        (match, index) =>
          `[${index + 1}] ${match.documentName} (fragment ${match.chunkIndex + 1})\n${match.content}`,
      )
      .join("\n\n");

    sources = matches.map((match, index) => ({
      index: index + 1,
      documentName: match.documentName,
      chunkIndex: match.chunkIndex,
      similarity: Number(match.similarity),
    }));
  } catch (error) {
    logger.error("chat.retrieval.failed", {
      organizationId: org.organization.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const systemPrompt = [
    "You are Recall, an assistant for a private knowledge workspace.",
    "Answer in the language of the question, in a few short paragraphs.",
    "Use only the context below. Cite every claim with the bracketed number of the passage it came from, for example [1].",
    "If the context does not contain the answer, say that the uploaded documents do not cover it and suggest uploading a relevant file. Never invent sources.",
    "",
    context || "(No relevant passages were retrieved for this question.)",
  ].join("\n");

  // 3. Stream response using AI SDK streamText without tools parameter to keep robust compatibility
  const result = await streamText({
    model: chatModel,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    onFinish: async ({ text }) => {
      // Save assistant message to DB when complete
      if (activeConversationId) {
        await addMessage({
          conversationId: activeConversationId,
          role: "assistant",
          content: text,
        });
      }
    },
  });

  // Headers carry what the plain text stream cannot: the conversation id to
  // keep the thread, and the sources the UI lists under the answer.
  return result.toTextStreamResponse({
    headers: {
      "x-conversation-id": activeConversationId,
      "x-sources": encodeURIComponent(JSON.stringify(sources)),
    },
  });
}
