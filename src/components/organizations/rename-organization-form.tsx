"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import type { FormState } from "@/lib/form-state";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameOrganizationAction } from "@/server/actions/organizations";

const initialState: FormState = {};

export function RenameOrganizationForm({
  orgSlug,
  name,
}: {
  orgSlug: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    renameOrganizationAction,
    initialState,
  );
  const nameError = state.fieldErrors?.name;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          name="name"
          defaultValue={name}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "workspace-name-error" : undefined}
        />
        <FieldError id="workspace-name-error" messages={nameError} />
      </div>

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground">{state.success}</p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
