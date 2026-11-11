"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import type { FormState } from "@/lib/form-state";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationAction } from "@/server/actions/organizations";

const initialState: FormState = {};

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );
  const nameError = state.fieldErrors?.name;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Inc."
          autoComplete="organization"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
        />
        <FieldError id="name-error" messages={nameError} />
        <p className="text-xs text-muted-foreground">
          The URL is generated from this name and cannot be changed later.
        </p>
      </div>

      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
