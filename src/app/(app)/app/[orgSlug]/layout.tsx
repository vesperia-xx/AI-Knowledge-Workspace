import Link from "next/link";

import { Brand } from "@/components/brand";
import { OrganizationNav } from "@/components/organizations/organization-nav";
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";
import { requireOrganization } from "@/server/auth/organization";
import { can } from "@/server/auth/authorization";
import { listOrganizationsForUser } from "@/server/services/organizations";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // Resolves the tenant from the URL and proves membership in one step.
  const { organization, role, user } = await requireOrganization(orgSlug);
  const organizations = await listOrganizationsForUser(user.id);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Brand />
            <span className="text-muted-foreground">/</span>
            <OrganizationSwitcher
              current={organization}
              organizations={organizations}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/onboarding"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              New workspace
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6">
          <OrganizationNav
            orgSlug={organization.slug}
            canManageSettings={can(role, "org:update")}
          />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
