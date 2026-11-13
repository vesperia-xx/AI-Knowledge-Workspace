import Link from "next/link";
import { FileTextIcon, MessageSquareIcon } from "lucide-react";

import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentsAutoRefresh } from "@/components/documents/documents-auto-refresh";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBytes } from "@/lib/format";
import { requireOrganization } from "@/server/auth/organization";
import { can } from "@/server/auth/authorization";
import { listDocuments } from "@/server/services/documents";

export const metadata = { title: "Documents" };

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization, role, user } = await requireOrganization(orgSlug);
  const documents = await listDocuments(organization.id);

  const canManageAny = can(role, "document:delete");
  const processing = documents.some(
    (document) =>
      document.status === "pending" || document.status === "processing",
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything here is private to {organization.name}. Uploads are
            parsed and split into passages in the background.
          </p>
        </div>
        <Link
          href={`/app/${organization.slug}/chat`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <MessageSquareIcon />
          Ask your documents
        </Link>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Upload a document</CardTitle>
          <CardDescription>
            The original file is kept for reference; answers will cite its text.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UploadDocumentForm orgSlug={organization.slug} />
          <DocumentsAutoRefresh active={processing} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Library</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "No documents yet."
              : `${documents.length} ${documents.length === 1 ? "document" : "documents"}.`}
          </CardDescription>
        </CardHeader>

        <CardContent className={documents.length === 0 ? undefined : "p-0"}>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <FileTextIcon className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a handbook, a policy or a product spec to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((document) => {
                const isOwner = document.uploadedById === user.id;
                const canDelete = canManageAny || isOwner;

                return (
                  <li
                    key={document.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {document.name}
                        </p>
                        <DocumentStatusBadge status={document.status} />
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(document.sizeBytes)} · {document.chunkCount}{" "}
                        {document.chunkCount === 1 ? "passage" : "passages"}
                        {document.pageCount
                          ? ` · ${document.pageCount} ${
                              document.pageCount === 1 ? "page" : "pages"
                            }`
                          : ""}{" "}
                        · uploaded {dateFormat.format(document.createdAt)}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        By {document.uploadedByName ?? "a removed user"}
                      </p>

                      {document.status === "failed" && document.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">
                          {document.errorMessage}
                        </p>
                      ) : null}
                    </div>

                    <DocumentActions
                      orgSlug={organization.slug}
                      documentId={document.id}
                      name={document.name}
                      canRetry={document.status === "failed" && canDelete}
                      canDelete={canDelete}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
