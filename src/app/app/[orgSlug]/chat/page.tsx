"use client";

import { use, useState } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentName: string;
    chunkIndex: number;
    content: string;
    similarity: number;
  }>;
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Manual chat submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage),
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat response");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const assistantMessageId = Math.random().toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        fullResponse += text;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg,
          ),
        );
      }

      setConversationId(conversationId); // TODO: Get from response
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.role === "assistant"
            ? { ...msg, content: "Error: Failed to generate response." }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            AI Knowledge Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions grounded in your workspace documents.
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-3">
            <Bot className="w-12 h-12 stroke-[1.5] text-indigo-500/60" />
            <h3 className="font-semibold text-lg text-foreground">How can I help you today?</h3>
            <p className="max-w-md text-sm">
              Ask anything about your uploaded workspace documents. Answers will cite exact sources.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-secondary text-secondary-foreground rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your documents..."
          className="flex-1 px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-600/50 text-sm shadow-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
