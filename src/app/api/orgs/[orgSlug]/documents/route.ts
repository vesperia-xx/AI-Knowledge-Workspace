import { NextResponse } from "next/server";

import { getOrganizationContext } from "@/server/auth/organization";
import { getCurrentUser } from "@/server/auth/session";
import { MAX_UPLOAD_BYTES } from "@/server/documents/file-types";
import {
  isAppError,
  toErrorResponse,
  ValidationError,
} from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { createDocument } from "@/server/services/documents";

/**
 * Inline processing (Vercel) runs after the response, so the function must stay
 * alive long enough to embed the chunks. 60s is the Hobby ceiling.
 */
export const maxDuration = 60;

/**
 * Uploads are a route handler, not a Server Action: actions cap request bodies
 * at 1 MB by default, and raising that limit for every action is worse than
 * giving uploads their own endpoint.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ orgSlug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to upload files." } },
      { status: 401 },
    );
  }

  const { orgSlug } = await context.params;

  // Resolving the tenant is also the authorization check: a non-member gets
  // the same answer as for a workspace that does not exist.
  const organization = await getOrganizationContext(orgSlug);
  if (!organization) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Workspace not found." } },
      { status: 404 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "The upload is malformed." } },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Choose a file to upload." } },
      { status: 400 },
    );
  }

  try {
    // Checked before buffering: a 500 MB body must not reach memory.
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError(
        `Files must be ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }

    const document = await createDocument({
      organizationId: organization.organization.id,
      actorId: user.id,
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { status, body } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }

    logger.error("documents.upload.failed", {
      organizationId: organization.organization.id,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Something went wrong." } },
      { status: 500 },
    );
  }
}
