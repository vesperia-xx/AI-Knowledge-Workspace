import { ROLE_LABELS } from "@/lib/roles";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MemberRoleForm } from "@/components/members/member-role-form";
import { RemoveMemberForm } from "@/components/members/remove-member-form";
import { RevokeInvitationForm } from "@/components/members/revoke-invitation-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOrganization } from "@/server/auth/organization";
import { can } from "@/server/auth/authorization";
import { listPendingInvitations } from "@/server/services/invitations";
import { listMembers } from "@/server/services/memberships";

export const metadata = { title: "Members" };

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const {
    organization,
    role: currentRole,
    user,
  } = await requireOrganization(orgSlug);

  const [members, invitations] = await Promise.all([
    listMembers(organization.id),
    listPendingInvitations(organization.id),
  ]);

  const canInvite = can(currentRole, "member:invite");
  const canChangeRoles = can(currentRole, "member:role:change");
  const canRemove = can(currentRole, "member:remove");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Who can see this workspace, and what they can do in it.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"}.
            Owners can change roles; admins can invite and remove.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.userId === user.id;
              // Mirrors the service guards so the button is not offered when it
              // would fail. Leaving is always allowed, so it is not gated by
              // `member:remove`; removing someone else is.
              const canRemoveThis =
                isSelf ||
                (canRemove &&
                  !(member.role === "owner" && currentRole !== "owner"));

              return (
                <li
                  key={member.userId}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name ?? member.email}
                      {isSelf ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canChangeRoles ? (
                      <MemberRoleForm
                        orgSlug={organization.slug}
                        userId={member.userId}
                        role={member.role}
                      />
                    ) : (
                      <Badge variant="secondary">
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}

                    {canRemoveThis ? (
                      <RemoveMemberForm
                        orgSlug={organization.slug}
                        userId={member.userId}
                        label={isSelf ? "Leave" : "Remove"}
                        confirmation={
                          isSelf
                            ? "Leave this workspace?"
                            : `Remove ${member.email} from this workspace?`
                        }
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {canInvite ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              You will get a single-use link to share. It expires in 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm orgSlug={organization.slug} />
          </CardContent>
        </Card>
      ) : null}

      {canInvite && invitations.length > 0 ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Unaccepted links. Revoking one makes the link stop working.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {invitations.map((invitation) => {
                return (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[invitation.role]} ·{" "}
                        {invitation.expired
                          ? "expired"
                          : `expires ${dateFormat.format(invitation.expiresAt)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {invitation.expired ? <Badge variant="outline">Expired</Badge> : null}
                      <RevokeInvitationForm
                        orgSlug={organization.slug}
                        invitationId={invitation.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
