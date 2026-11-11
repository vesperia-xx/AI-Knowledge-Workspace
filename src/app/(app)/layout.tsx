import { requireUser } from "@/server/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already redirected anonymous visitors, but this is the check that
  // actually protects the data: it runs on the server, against the database.
  await requireUser();

  return <div className="flex min-h-svh flex-col">{children}</div>;
}
