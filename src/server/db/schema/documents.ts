import { relations } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { organizations } from "./organizations";

export const DOCUMENT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export const documentStatus = pgEnum("document_status", DOCUMENT_STATUSES);

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Custom pgvector type for Drizzle ORM.
 */
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions?: number };
}>({
  dataType(config) {
    return config?.dimensions ? `vector(${config.dimensions})` : "vector";
  },
  fromDriver(value: string): number[] {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    extension: text("extension").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: documentStatus("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    pageCount: integer("page_count"),
    chunkCount: integer("chunk_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (document) => [
    index("documents_organization_id_created_at_idx").on(
      document.organizationId,
      document.createdAt,
    ),
  ],
);

/**
 * Extracted passages with vector embeddings for semantic search.
 */
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    charCount: integer("char_count").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (chunk) => [
    uniqueIndex("document_chunks_document_id_chunk_index_idx").on(
      chunk.documentId,
      chunk.chunkIndex,
    ),
  ],
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));
