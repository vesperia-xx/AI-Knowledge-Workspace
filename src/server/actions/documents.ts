"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { requireOrganization } from "@/server/auth/organization";
import { AppError } from "@/server/lib/errors";
import {
  deleteDocument,
  retryDocument,
} from "@/server/services/documents";

const documentIdSchema = z.uuid();

async function resolveDocumentId(formData: FormData) {
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const parsed = documentIdSchema.safeParse(formData.get("documentId"));
  if (!parsed.success) return null;

  return { organization, user, documentId: parsed.data };
}

export async function deleteDocumentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const resolved = await resolveDocumentId(formData);
  if (!resolved) return { message: "That document is not valid." };

  try {
    await deleteDocument({
      organizationId: resolved.organization.id,
      actorId: resolved.user.id,
      documentId: resolved.documentId,
    });
  } catch (error) {
    if (error instanceof AppError) return { message: error.message };
    throw error;
  }

  revalidatePath(`/app/${resolved.organization.slug}/documents`);
  return { success: "Document deleted." };
}

export async function retryDocumentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const resolved = await resolveDocumentId(formData);
  if (!resolved) return { message: "That document is not valid." };

  try {
    await retryDocument({
      organizationId: resolved.organization.id,
      actorId: resolved.user.id,
      documentId: resolved.documentId,
    });
  } catch (error) {
    if (error instanceof AppError) return { message: error.message };
    throw error;
  }

  revalidatePath(`/app/${resolved.organization.slug}/documents`);
  return { success: "Processing restarted." };
}
