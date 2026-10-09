/**
 * Terminal logging for API route handlers:
 *
 *   [API_START]   POST /api/title-submissions
 *   [API_SUCCESS] POST /api/title-submissions 201 in 142ms
 *   [API_FAILED]  POST /api/title-submissions 409 in 38ms - A title with this name already exists.
 *   [API_ERROR]   POST /api/title-submissions threw after 51ms - <error message + stack>
 *
 * START/SUCCESS/FAILED print in development only (or when API_LOGGING=true), so production
 * logs stay quiet. Thrown errors always print. Request bodies are never logged; for 4xx/5xx
 * responses only the JSON `message`/`error` field is shown.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const verbose = process.env.NODE_ENV !== 'production' || process.env.API_LOGGING === 'true';
const useColor = !process.env.NO_COLOR;

const paint = (code: number, text: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const tag = {
  start: paint(36, '[API_START]'),
  success: paint(32, '[API_SUCCESS]'),
  failed: paint(33, '[API_FAILED]'),
  error: paint(31, '[API_ERROR]')
};

function formatMs(ms: number) {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/** The real path (with ids) when the first argument is the Request, else the route pattern. */
function describePath(route: string, args: unknown[]) {
  const request = args[0];

  if (request instanceof Request) {
    try {
      return new URL(request.url).pathname;
    } catch {
      // Fall back to the route pattern.
    }
  }

  return route;
}

/** Pull a short reason out of an error response's JSON body without consuming the original. */
async function readFailureReason(response: Response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return '';
  }

  try {
    const body = (await response.clone().json()) as { message?: unknown; error?: unknown } | null;
    const reason = body?.message ?? body?.error;
    return typeof reason === 'string' ? reason.slice(0, 200) : '';
  } catch {
    return '';
  }
}

export function withApiLogging<Args extends unknown[], R extends Response>(
  method: HttpMethod,
  route: string,
  handler: (...args: Args) => Promise<R> | R
): (...args: Args) => Promise<R> {
  return async (...args: Args) => {
    const path = describePath(route, args);
    const label = `${method} ${path}`;
    const startedAt = performance.now();

    if (verbose) {
      console.log(`${tag.start} ${label}`);
    }

    try {
      const response = await handler(...args);
      const elapsed = formatMs(performance.now() - startedAt);

      if (verbose) {
        if (response.status >= 400) {
          const reason = await readFailureReason(response);
          console.log(`${tag.failed} ${label} ${response.status} in ${elapsed}${reason ? ` - ${reason}` : ''}`);
        } else {
          console.log(`${tag.success} ${label} ${response.status} in ${elapsed}`);
        }
      }

      return response;
    } catch (error) {
      // Next.js control-flow throws (redirect(), notFound()) aren't failures; let them pass through quietly.
      const digest = (error as { digest?: unknown } | null)?.digest;

      if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))) {
        if (verbose) {
          const outcome = digest.startsWith('NEXT_REDIRECT') ? `redirect -> ${digest.split(';')[2] ?? '?'}` : 'not found';
          console.log(`${tag.success} ${label} ${outcome} in ${formatMs(performance.now() - startedAt)}`);
        }

        throw error;
      }

      const elapsed = formatMs(performance.now() - startedAt);
      console.error(`${tag.error} ${label} threw after ${elapsed} -`, error);
      throw error;
    }
  };
}
