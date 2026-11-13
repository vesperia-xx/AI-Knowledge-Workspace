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
 * Default chat model to use via OpenRouter.
 *
 * Configurable with CHAT_MODEL because model names are retired often; pinning
 * a dead slug produces empty streams instead of a loud error.
 */
export const chatModel = openrouter.chat(
  process.env.CHAT_MODEL ?? "openai/gpt-4o-mini",
);
