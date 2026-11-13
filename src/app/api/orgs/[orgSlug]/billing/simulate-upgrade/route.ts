import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getOrganizationContext } from "@/server/auth/organization";
import { requireMembership } from "@/server/services/memberships";
import { assertCan } from "@/server/auth/authorization";
import { updateOrganizationPlan, PLANS, PlanType } from "@/server/services/plans";
import { isAppError, toErrorResponse } from "@/server/lib/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ orgSlug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión." } },
      { status: 401 }
    );
  }

  const { orgSlug } = await context.params;
  const organizationContext = await getOrganizationContext(orgSlug);
  if (!organizationContext) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Organización no encontrada." } },
      { status: 404 }
    );
  }

  const orgId = organizationContext.organization.id;
  const actor = await requireMembership(orgId, user.id);
  
  // Solo owners/admins pueden cambiar el plan
  assertCan(actor.role, "org:update");

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Cuerpo de solicitud inválido." } },
      { status: 400 }
    );
  }

  const plan = body.plan as PlanType;
  if (!plan || !PLANS[plan]) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Plan inválido." } },
      { status: 400 }
    );
  }

  try {
    await updateOrganizationPlan({ organizationId: orgId, plan });
    return NextResponse.json({ success: true, plan, details: PLANS[plan] });
  } catch (error) {
    if (isAppError(error)) {
      const { status, body } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Error al actualizar el plan." } },
      { status: 500 }
    );
  }
}
