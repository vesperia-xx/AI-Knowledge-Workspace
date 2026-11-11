/** Shape every mutation action returns to its form. */
export type FormState = {
  message?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Invitations have no email provider yet, so the action returns a share link. */
export type InviteFormState = FormState & {
  inviteUrl?: string;
  invitedEmail?: string;
};
