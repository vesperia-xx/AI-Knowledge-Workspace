"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { requireOrganization } from "@/server/auth/organization";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/lib/errors";
import {
  createOrganization,
  renameOrganization,
} from "@/server/services/organizations";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(60, "Use at most 60 characters."),
});

export async function createOrganizationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const organization = await createOrganization({
    userId: user.id,
    name: parsed.data.name,
  });

  redirect(`/app/${organization.slug}`);
}

export async function renameOrganizationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  // The slug comes from the form and is untrusted; resolving the context both
  // validates it and proves the caller is a member.
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await renameOrganization({
      organizationId: organization.id,
      actorId: user.id,
      name: parsed.data.name,
    });
  } catch (error) {
    if (error instanceof AppError) return { message: error.message };
    throw error;
  }

  revalidatePath(`/app/${organization.slug}/settings`);
  return { success: "Workspace name updated." };
}
