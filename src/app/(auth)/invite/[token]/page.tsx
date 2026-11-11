import Link from "next/link";

import { AcceptInvitationForm } from "@/components/invitations/accept-invitation-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/roles";
import { signOutAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/session";
import { getInvitationPreview } from "@/server/services/invitations";

export const metadata = { title: "Invitation" };

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function InviteShell({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

/**
 * One URL, several states. Everything is decided on the server from the token
 * and the session, so the page never flashes the wrong call to action.
 *
 * The token is looked up by exact match; there is nothing to guess and no list
 * endpoint. A wrong token is indistinguishable from a revoked one on purpose.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const callbackUrl = `/invite/${token}`;

  const invitation = await getInvitationPreview(token);

  if (!invitation) {
    return (
      <InviteShell
        title="Invitation not found"
        description="This link is not valid. It may have been revoked, or the workspace no longer exists."
      >
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Go to sign in
        </Link>
      </InviteShell>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <InviteShell
        title="Invitation already used"
        description="This single-use link has already been accepted. Sign in to open the workspace."
      >
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Go to dashboard
        </Link>
      </InviteShell>
    );
  }

  if (invitation.status === "expired") {
    return (
      <InviteShell
        title="Invitation expired"
        description={`This invitation to ${invitation.organizationName} expired on ${dateFormat.format(invitation.expiresAt)}. Ask an admin for a new one.`}
      />
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return (
      <InviteShell
        title={`Join ${invitation.organizationName}`}
        description={
          <>
            {invitation.inviterName ?? "An admin"} invited you as{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS[invitation.role]}
            </span>
            . Sign in or create an account with the invited email address to
            accept.
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className={buttonVariants()}
          >
            Sign in
          </Link>
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Create account
          </Link>
        </div>
      </InviteShell>
    );
  }

  // The invitation belongs to an email address, not to whoever holds the link.
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InviteShell
        title="Wrong account"
        description={
          <>
            You are signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>, but
            this invitation was sent to a different address. Sign in with the
            invited account to accept it.
          </>
        }
      >
        <form action={signOutAction}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button type="submit" variant="outline">
            Sign out and use another account
          </Button>
        </form>
      </InviteShell>
    );
  }

  return (
    <InviteShell
      title={`Join ${invitation.organizationName}`}
      description={
        <>
          You will join as{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[invitation.role]}
          </span>
          . This link expires on {dateFormat.format(invitation.expiresAt)}.
        </>
      }
    >
      <AcceptInvitationForm token={token} />
    </InviteShell>
  );
}
