"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { requireOrganization } from "@/server/auth/organization";
import { AppError } from "@/server/lib/errors";
import {
  changeMemberRole,
  removeMember,
} from "@/server/services/memberships";
import { MEMBER_ROLES } from "@/server/db/schema";

const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(MEMBER_ROLES),
});

export async function changeMemberRoleAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) return { message: "That role change is not valid." };

  try {
    await changeMemberRole({
      organizationId: organization.id,
      actorId: user.id,
      targetUserId: parsed.data.userId,
      role: parsed.data.role,
    });
  } catch (error) {
    if (error instanceof AppError) return { message: error.message };
    throw error;
  }

  revalidatePath(`/app/${organization.slug}/settings/members`);
  return { success: "Role updated." };
}

export async function removeMemberAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const targetUserId = z.uuid().safeParse(formData.get("userId"));
  if (!targetUserId.success) return { message: "That member is not valid." };

  try {
    await removeMember({
      organizationId: organization.id,
      actorId: user.id,
      targetUserId: targetUserId.data,
    });
  } catch (error) {
    if (error instanceof AppError) return { message: error.message };
    throw error;
  }

  // Leaving a workspace invalidates the page we are standing on.
  if (targetUserId.data === user.id) redirect("/dashboard");

  revalidatePath(`/app/${organization.slug}/settings/members`);
  return { success: "Member removed." };
}
