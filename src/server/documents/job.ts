/**
 * Describes a job without pulling in the queue client. The worker imports this
 * type and must not create a `Queue` (only producers need one).
 */
export const DOCUMENTS_QUEUE = "documents";

export type DocumentJobData = {
  documentId: string;
  organizationId: string;
};
