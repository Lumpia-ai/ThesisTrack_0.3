import {
  requireAccountHolder,
  setWorkspaceCookie,
  toAccountSummary,
  toAuthenticatedUser,
  toPublicUser
} from '@/lib/auth';
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const ROLE_NOT_AVAILABLE = 'That role is not available to your account.';

/** The roles the signed-in user can work as, and which one is active. */
async function handleGET(request: Request) {
  try {
    const access = await requireAccountHolder(request);

    return successResponse({ account: toAccountSummary(access) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Switches the active workspace. The client only names an assignment; the server accepts it only if it is
 * one of the user's own active, usable assignments, so switching can never reach a role that wasn't granted.
 */
async function handlePOST(request: Request) {
  try {
    const access = await requireAccountHolder(request);
    const body = await parseJsonBody<{ workspaceId?: unknown }>(request);
    const workspaceId = normalizeText(body.workspaceId);
    const workspace = access.workspaces.find((candidate) => candidate.assignmentId === workspaceId);
    const switched = { ...access, workspace: workspace ?? null };
    const user = workspace ? toAuthenticatedUser(switched) : null;

    if (!user || !workspace) {
      throw new HttpError(ROLE_NOT_AVAILABLE, 403);
    }

    const response = successResponse({
      user: toPublicUser(user),
      account: toAccountSummary(switched)
    });
    setWorkspaceCookie(response, user.id, workspace.assignmentId);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/auth/workspace', handleGET);
export const POST = withApiLogging('POST', '/api/auth/workspace', handlePOST);
