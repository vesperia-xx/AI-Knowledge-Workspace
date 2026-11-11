import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth/session";
import { listOrganizationsForUser } from "@/server/services/organizations";

export const metadata = { title: "Create your workspace" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const organizations = await listOrganizationsForUser(user.id);

  if (organizations.length > 0) redirect(`/app/${organizations[0].slug}`);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Create your workspace</CardTitle>
              <CardDescription>
                Documents, members and answers live inside a workspace. You will
                be its owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateOrganizationForm />

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
                <p className="truncate text-xs text-muted-foreground">
                  Signed in as {user.email}
                </p>
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
