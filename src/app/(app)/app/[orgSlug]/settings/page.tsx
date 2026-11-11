import { notFound } from "next/navigation";

import { RenameOrganizationForm } from "@/components/organizations/rename-organization-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOrganization } from "@/server/auth/organization";
import { can } from "@/server/auth/authorization";

export const metadata = { title: "Workspace settings" };

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization, role } = await requireOrganization(orgSlug);

  // The service checks this too; the UI check only avoids showing a form that
  // would fail. Never rely on it for authorization.
  if (!can(role, "org:update")) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Only owners and admins can change these values.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            The URL stays fixed so shared links keep working.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <RenameOrganizationForm
            orgSlug={organization.slug}
            name={organization.name}
          />

          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <span className="text-sm font-medium">Workspace URL</span>
            <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              /app/{organization.slug}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
