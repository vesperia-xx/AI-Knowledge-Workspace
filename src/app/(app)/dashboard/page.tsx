import { FileTextIcon, MessageSquareIcon, UsersIcon } from "lucide-react";

import { requireUser } from "@/server/auth/session";

export const metadata = { title: "Dashboard" };

const upcoming = [
  {
    icon: UsersIcon,
    title: "Create your workspace",
    body: "Organizations, roles and invitations arrive in Phase 2.",
  },
  {
    icon: FileTextIcon,
    title: "Upload documents",
    body: "Parsing, chunking and background processing arrive in Phase 3.",
  },
  {
    icon: MessageSquareIcon,
    title: "Ask your documents",
    body: "Retrieval, citations and streaming answers arrive in Phase 4 and 5.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Phase 1 complete
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account exists, your session is a signed cookie, and every request
          re-checks that this user still exists. The workspace comes next.
        </p>
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Account</dt>
          <dd className="mt-1 truncate text-sm font-medium">{user.email}</dd>
        </div>
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Session strategy</dt>
          <dd className="mt-1 text-sm font-medium">JWT cookie, 30 days</dd>
        </div>
        <div className="bg-background p-5">
          <dt className="text-xs text-muted-foreground">Database</dt>
          <dd className="mt-1 text-sm font-medium">Postgres 17 + Drizzle</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        {upcoming.map((item) => (
          <div key={item.title} className="bg-background p-6">
            <item.icon className="size-4 text-muted-foreground" />
            <h2 className="mt-4 text-sm font-medium">{item.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
