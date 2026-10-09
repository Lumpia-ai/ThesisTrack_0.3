import { NextResponse, type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  let redirectUrl = '';

  try {
    const supabase = await createClient();
    
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const origin = host ? `${protocol}://${host}` : new URL(request.url).origin;
    
    // We want to redirect back to our custom callback
    const callbackUrl = new URL('/api/auth/google/callback', origin).toString();
    console.log('[OAuth] Initiating with redirect URL:', callbackUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[OAuth] Supabase signInWithOAuth error:', error);
      throw error;
    }

    if (data.url) {
      console.log('[OAuth] Redirect URL generated successfully.');
      redirectUrl = data.url;
    } else {
      throw new Error('Failed to generate Google authorization URL');
    }
  } catch (error: any) {
    console.error('[OAuth] Route initialization error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Authentication configuration error' },
      { status: 500 }
    );
  }

  // Return NextResponse.redirect to preserve cookies set by Supabase (e.g. PKCE verifier)
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({ error: 'Failed to generate redirect URL' }, { status: 500 });
}

export const GET = withApiLogging('GET', '/api/auth/google', handleGET);
