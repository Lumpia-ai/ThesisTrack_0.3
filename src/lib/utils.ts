import { NextResponse } from 'next/server';

export const PASSWORD_MIN_LENGTH = 6;

export class HttpError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError('Request body must be valid JSON.', 400);
  }
}

export function successResponse(payload: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...payload
    },
    { status }
  );
}

export function errorResponse(message: string, status = 400, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(fieldErrors && Object.keys(fieldErrors).length ? { fieldErrors } : {})
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return errorResponse(error.message, error.status, error.fieldErrors);
  }

  console.error(error);
  return errorResponse('Something went wrong. Please try again later.', 500);
}
