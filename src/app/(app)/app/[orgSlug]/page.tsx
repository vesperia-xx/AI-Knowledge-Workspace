import Link from "next/link";
import { FileTextIcon, MessageSquareIcon, UsersIcon } from "lucide-react";

import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganization } from "@/server/auth/organization";
import { can } from "@/server/auth/authorization";
import { countDocuments } from "@/server/services/documents";
import { listMembers } from "@/server/services/memberships";

export default async function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization, role } = await requireOrganization(orgSlug);
  const [members, documentCount] = await Promise.all([
    listMembers(organization.id),
    countDocuments(organization.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Phase 3 complete
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {organization.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every document, query and member from now on belongs to this
            workspace. Nothing is visible across workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
          <Link
            href={`/app/${organization.slug}/settings/members`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <UsersIcon />
            Members
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Workspace URL</dt>
          <dd className="mt-1 truncate font-mono text-sm">
            /app/{organization.slug}
          </dd>
        </div>
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Members</dt>
          <dd className="mt-1 text-sm font-medium">{members.length}</dd>
        </div>
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Documents</dt>
          <dd className="mt-1 text-sm font-medium">{documentCount}</dd>
        </div>
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Your role</dt>
          <dd className="mt-1 text-sm font-medium">{ROLE_LABELS[role]}</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        <div className="bg-background p-6">
          <FileTextIcon className="size-4 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">Upload documents</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Add a PDF, Word file, Markdown or text document. It is parsed and
            split into passages in the background.
          </p>
          <Link
            href={`/app/${organization.slug}/documents`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
            )}
          >
            Open documents
          </Link>
        </div>
        <div className="bg-background p-6">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">Ask your documents</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Retrieval, citations and streaming answers arrive in Phase 4 and 5.
          </p>
        </div>
        <div className="bg-background p-6">
          <UsersIcon className="size-4 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">
            {can(role, "member:invite") ? "Invite your team" : "Your team"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {can(role, "member:invite")
              ? "Create an invite link from the members page."
              : "Ask an admin if you need access to more workspaces."}
          </p>
        </div>
      </div>
    </div>
  );
}
