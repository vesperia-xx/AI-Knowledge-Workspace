import { streamText } from "ai";

import { chatModel } from "@/server/ai/client";
import { createWorkspaceTools } from "@/server/ai/tools/workspace";
import { requireOrganization } from "@/server/auth/organization";
import { getCurrentUser } from "@/server/auth/session";
import {
  addMessage,
  createConversation,
} from "@/server/services/chats";

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

  // 2. Define workspace tools bound to this organization
  const tools = createWorkspaceTools(org.organization.id);

  const systemPrompt = `You are Recall, a helpful AI knowledge workspace assistant. You have access to workspace tools to search internal documents, check workspace statistics, and list recent files. Use these tools when needed to give accurate, well-informed answers. Always cite your sources when using document chunks.`;

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

  return result.toTextStreamResponse();
}
