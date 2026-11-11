"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState, InviteFormState } from "@/lib/form-state";
import { requireOrganization } from "@/server/auth/organization";
import { requireUser } from "@/server/auth/session";
import { absoluteUrl } from "@/server/lib/url";
import {
  acceptInvitation,
  createInvitation,
  revokeInvitation,
} from "@/server/services/invitations";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  // Ownership is never granted by link.
  role: z.enum(["admin", "member"]),
});

export async function createInvitationAction(
  _previousState: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await createInvitation({
    organizationId: organization.id,
    actorId: user.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (!result.ok) {
    if (result.reason === "already_member") {
      return {
        fieldErrors: { email: ["That person is already a member."] },
      };
    }
    return {
      fieldErrors: {
        role: ["Ownership is granted from the members list, not by invitation."],
      },
    };
  }

  revalidatePath(`/app/${organization.slug}/settings/members`);

  return {
    success: "Invitation created. Share the link below.",
    inviteUrl: await absoluteUrl(`/invite/${result.invitation.token}`),
    invitedEmail: result.invitation.email,
  };
}

export async function revokeInvitationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization, user } = await requireOrganization(
    String(formData.get("orgSlug") ?? ""),
  );

  const invitationId = z.uuid().safeParse(formData.get("invitationId"));
  if (!invitationId.success) return { message: "That invitation is not valid." };

  await revokeInvitation({
    organizationId: organization.id,
    actorId: user.id,
    invitationId: invitationId.data,
  });

  revalidatePath(`/app/${organization.slug}/settings/members`);
  return { success: "Invitation revoked." };
}

const ACCEPT_ERRORS = {
  not_found: "This invitation link is not valid.",
  expired: "This invitation has expired. Ask an admin for a new one.",
  already_accepted: "This invitation has already been used.",
  wrong_account:
    "This invitation was sent to a different email address. Sign in with the address that received it.",
} as const;

export async function acceptInvitationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");

  const result = await acceptInvitation({
    token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) return { message: ACCEPT_ERRORS[result.reason] };

  redirect(`/app/${result.organizationSlug}`);
}
