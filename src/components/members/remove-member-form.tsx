"use client";

import { useActionState } from "react";

import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "@/server/actions/members";

const initialState: FormState = {};

export function RemoveMemberForm({
  orgSlug,
  userId,
  label,
  confirmation,
}: {
  orgSlug: string;
  userId: string;
  label: string;
  confirmation: string;
}) {
  const [state, formAction, pending] = useActionState(
    removeMemberAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col items-start gap-1"
      onSubmit={(event) => {
        // Without JS this confirmation is skipped; the guard in the service is
        // what actually protects the workspace.
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="userId" value={userId} />

      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={pending}
      >
        {label}
      </Button>

      {state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
