"use client";

import { useActionState } from "react";

import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  deleteDocumentAction,
  retryDocumentAction,
} from "@/server/actions/documents";

const initialState: FormState = {};

export function DocumentActions({
  orgSlug,
  documentId,
  name,
  canRetry,
  canDelete,
}: {
  orgSlug: string;
  documentId: string;
  name: string;
  canRetry: boolean;
  canDelete: boolean;
}) {
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteDocumentAction,
    initialState,
  );
  const [retryState, retryAction, retrying] = useActionState(
    retryDocumentAction,
    initialState,
  );

  const message = deleteState.message ?? retryState.message;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {canRetry ? (
          <form action={retryAction}>
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="documentId" value={documentId} />
            <Button type="submit" size="sm" variant="outline" disabled={retrying}>
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          </form>
        ) : null}

        {canDelete ? (
          <form
            action={deleteAction}
            onSubmit={(event) => {
              // The service enforces the permission; this only avoids accidents.
              if (!window.confirm(`Delete "${name}" and its passages?`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="documentId" value={documentId} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </form>
        ) : null}
      </div>

      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
