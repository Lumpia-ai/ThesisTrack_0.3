import { createClient } from '@/lib/supabase/server';
import { handleApiError, successResponse } from '@/lib/utils';
import { clearAuthCookie, clearWorkspaceCookie } from '@/lib/auth';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handlePOST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = successResponse({ message: 'Logged out successfully.' });
    clearAuthCookie(response);
    clearWorkspaceCookie(response);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/auth/logout', handlePOST);
