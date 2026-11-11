"use client";

import { useActionState } from "react";

import type { FormState } from "@/lib/form-state";
import { ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { changeMemberRoleAction } from "@/server/actions/members";
import type { MemberRole } from "@/server/db/schema";

const initialState: FormState = {};

export function MemberRoleForm({
  orgSlug,
  userId,
  role,
}: {
  orgSlug: string;
  userId: string;
  role: MemberRole;
}) {
  const [state, formAction, pending] = useActionState(
    changeMemberRoleAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="userId" value={userId} />

        <NativeSelect
          name="role"
          defaultValue={role}
          disabled={pending}
          aria-label="Member role"
        >
          {(Object.keys(ROLE_LABELS) as MemberRole[]).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </NativeSelect>

        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Save
        </Button>
      </div>

      {state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-muted-foreground">{state.success}</p>
      ) : null}
    </form>
  );
}
