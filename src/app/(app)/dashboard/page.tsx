import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/session";
import { listOrganizationsForUser } from "@/server/services/organizations";

export const metadata = { title: "Dashboard" };

/**
 * Not a real page: it decides where the user belongs. A user with no workspace
 * is sent to onboarding; otherwise the first workspace is a stable default.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const organizations = await listOrganizationsForUser(user.id);

  if (organizations.length === 0) redirect("/onboarding");

  redirect(`/app/${organizations[0].slug}`);
}
