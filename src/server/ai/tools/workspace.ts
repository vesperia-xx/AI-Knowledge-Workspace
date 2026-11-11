import { z } from "zod";
import { getContextForQuery } from "@/server/services/chats";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { eq, desc, count } from "drizzle-orm";

export function createWorkspaceTools(organizationId: string) {
  return {
    searchWorkspaceDocuments: {
      description:
        "Search internal documents for specific information using semantic search.",
      parameters: z.object({
        query: z.string().describe("The search query"),
      }),
      execute: async ({ query }: { query: string }) => {
        const results = await getContextForQuery({
          organizationId,
          query,
        });
        if (results.length === 0) return "No matching documents found.";
        return results.map((r, i) => `[Source ${i + 1}: ${r.documentName}]\n${r.content}`).join("\n\n");
      },
    },
    listRecentDocuments: {
      description: "List recently uploaded documents.",
      parameters: z.object({
        limit: z.number().optional().describe("Limit"),
      }),
      execute: async ({ limit }: { limit?: number }) => {
        const recentDocs = await db.query.documents.findMany({
          where: eq(documents.organizationId, organizationId),
          orderBy: [desc(documents.createdAt)],
          limit: limit ?? 5,
        });
        if (recentDocs.length === 0) return "No documents found.";
        return recentDocs.map((d) => `- ${d.name} (${d.status})`).join("\n");
      },
    },
    getWorkspaceStats: {
      description: "Get workspace statistics.",
      parameters: z.object({}),
      execute: async () => {
        const [res] = await db.select({ count: count() }).from(documents).where(eq(documents.organizationId, organizationId));
        return JSON.stringify({ totalDocuments: res?.count ?? 0 });
      },
    },
  };
}
