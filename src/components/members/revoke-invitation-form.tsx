"use client";

import { useActionState } from "react";

import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { revokeInvitationAction } from "@/server/actions/invitations";

const initialState: FormState = {};

export function RevokeInvitationForm({
  orgSlug,
  invitationId,
}: {
  orgSlug: string;
  invitationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    revokeInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="invitationId" value={invitationId} />

      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Revoke
      </Button>

      {state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
