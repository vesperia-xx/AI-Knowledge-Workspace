"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import type { InviteFormState } from "@/lib/form-state";
import { FieldError } from "@/components/auth/field-error";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createInvitationAction } from "@/server/actions/invitations";

const initialState: InviteFormState = {};

export function InviteMemberForm({ orgSlug }: { orgSlug: string }) {
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    initialState,
  );

  const emailError = state.fieldErrors?.email;
  const roleError = state.fieldErrors?.role;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="orgSlug" value={orgSlug} />

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="teammate@company.com"
            autoComplete="off"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "invite-email-error" : undefined}
          />
          <FieldError id="invite-email-error" messages={emailError} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <NativeSelect
            id="invite-role"
            name="role"
            defaultValue="member"
            aria-invalid={roleError ? true : undefined}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </NativeSelect>
          <FieldError id="invite-role-error" messages={roleError} />
        </div>

        <Button type="submit" disabled={pending} className="sm:mb-0">
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? "Creating…" : "Create invite link"}
        </Button>
      </form>

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.inviteUrl ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Invite link for{" "}
            <span className="font-medium text-foreground">
              {state.invitedEmail}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              readOnly
              value={state.inviteUrl}
              className="font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Invitation link"
            />
            <CopyButton value={state.inviteUrl} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            No email is sent yet. Share this link manually; it expires in 7 days.
          </p>
        </div>
      ) : null}
    </div>
  );
}
