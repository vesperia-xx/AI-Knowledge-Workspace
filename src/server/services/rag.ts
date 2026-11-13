import "server-only";

import { embed } from "ai";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { documentChunks, documents } from "@/server/db/schema";
import { embeddingModel } from "@/server/ai/client";

/**
 * Generates a vector embedding for a given text passage using OpenRouter (OpenAI embeddings model).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

/**
 * Generates embeddings for multiple text passages in batch (or sequentially if needed).
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // We can batch or process them. Vercel AI SDK embed doesn't always take arrays depending on provider,
  // so looping or batching ensures robust execution.
  const embeddings: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}

/**
 * Searches for document chunks in a specific organization that are semantically similar to the query.
 */
export async function searchSimilarChunks({
  organizationId,
  query,
  limit = 5,
  similarityThreshold = 0.3,
}: {
  organizationId: string;
  query: string;
  limit?: number;
  similarityThreshold?: number;
}) {
  const queryEmbedding = await generateEmbedding(query);

  // Cosine distance: 1 - cosine_distance = cosine similarity
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      chunkId: documentChunks.id,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      content: documentChunks.content,
      chunkIndex: documentChunks.chunkIndex,
      similarity,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(
      sql`${documents.organizationId} = ${organizationId} AND ${documents.status} = 'ready' AND 1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)}) > ${similarityThreshold}`,
    )
    .orderBy((t) => desc(t.similarity))
    .limit(limit);

  return results;
}
