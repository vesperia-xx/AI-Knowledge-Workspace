"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/server/actions/invitations";

const initialState: FormState = {};

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </form>
  );
}
