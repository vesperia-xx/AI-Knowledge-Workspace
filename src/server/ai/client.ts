import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenRouter provider configured for Vercel AI SDK.
 * OpenRouter provides an OpenAI-compatible API endpoint.
 */
export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

/**
 * Default embedding model to use via OpenRouter.
 * openai/text-embedding-3-small is standard, fast, and cost-effective.
 */
export const embeddingModel = openrouter.embedding("openai/text-embedding-3-small");

/**
 * Default chat model to use via OpenRouter (for future phases).
 */
export const chatModel = openrouter.chat("anthropic/claude-3.5-sonnet");
