import { GoogleGenAI } from '@google/genai';

export const GEMINI_FREE_MODEL = 'gemini-4-hydrogen';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const status = getErrorStatusCode(error);
      // Do not retry auth or validation errors
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        throw error;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 650 * attempt));
      }
    }
  }
  throw lastError;
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const e = error as { status?: number; code?: number };
    if (typeof e.status === 'number') return e.status;
    if (typeof e.code === 'number') return e.code;
  }
  return undefined;
}

export function formatGeminiErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof GeminiConfigError) {
    return { status: 500, message: error.message };
  }

  const rawMessage =
    error instanceof Error ? error.message : 'Unexpected Gemini AI error.';
  const status = getErrorStatusCode(error);

  if (
    status === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key permission error. Please check your key in Settings > Secrets.',
    };
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'AI Florist is briefly busy due to rate limits. Please wait a few seconds and try again.',
    };
  }

  if (status === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: 'Requested Gemini model is temporarily unavailable.',
    };
  }

  return {
    status: status && status >= 400 && status < 600 ? status : 500,
    message:
      rawMessage.length > 220 ? `${rawMessage.slice(0, 220)}…` : rawMessage,
  };
}
