"use client";

import { use, useState } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

type Source = {
  index: number;
  documentName: string;
  chunkIndex: number;
  similarity: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
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

      // The stream is plain text; metadata travels in headers.
      const returnedConversationId = response.headers.get("x-conversation-id");
      if (returnedConversationId) setConversationId(returnedConversationId);

      const sourcesHeader = response.headers.get("x-sources");
      const sources: Source[] = sourcesHeader
        ? JSON.parse(decodeURIComponent(sourcesHeader))
        : [];

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const assistantMessageId = Math.random().toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        sources,
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
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content:
            "No pude generar la respuesta. Revisa la conexión e inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100svh-11rem)] w-full max-w-5xl flex-col p-4 md:p-6">
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

                  {m.role === "assistant" && m.sources?.length ? (
                    <div className="mt-3 border-t border-border/40 pt-2 text-xs opacity-80">
                      <p className="font-medium">Sources</p>
                      <ol className="mt-1 space-y-0.5">
                        {m.sources.map((source) => (
                          <li key={`${source.documentName}-${source.chunkIndex}`}>
                            [{source.index}] {source.documentName} · fragment{" "}
                            {source.chunkIndex + 1}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
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
