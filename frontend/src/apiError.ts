import type { DetailedError } from 'hono/client';

type ErrorContext =
  | 'login'
  | 'signup'
  | 'load food types'
  | 'add food type'
  | 'update food type'
  | 'delete food type'
  | 'load stocked items'
  | 'add item'
  | 'update item'
  | 'delete item';

type ErrorDetails = {
  data?: {
    error?: unknown;
    message?: unknown;
  };
};

function isDetailedError(error: unknown): error is DetailedError & {
  detail?: ErrorDetails;
} {
  return error instanceof Error && 'statusCode' in error;
}

function getServerMessage(error: unknown): string | undefined {
  if (!isDetailedError(error)) return undefined;

  const data = error.detail?.data;
  if (!data || typeof data !== 'object') return undefined;

  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  return undefined;
}

export function getApiErrorMessage(error: unknown, context: ErrorContext): string {
  if (!isDetailedError(error) || typeof error.statusCode !== 'number') {
    return `We couldn't ${context}. Check your connection and try again.`;
  }

  const serverMessage = getServerMessage(error);

  switch (error.statusCode) {
    case 400:
      return 'Some of the information is invalid. Please try again.';
    case 401:
      return context === 'login'
        ? 'The email or password is incorrect.'
        : 'Your session has expired. Please sign in again.';
    case 403:
      return context.includes('food type')
        ? 'You can only change or remove food types that you created.'
        : 'You do not have permission to perform this action.';
    case 404:
      if (context === 'delete food type' || context === 'update food type') {
        return 'This food type could not be found. It may have already been removed.';
      }
      if (context === 'delete item' || context === 'update item') {
        return 'This stocked item could not be found. It may have already been removed.';
      }
      return `We couldn't ${context} because the requested resource was not found.`;
    case 409:
      if (context === 'signup') {
        if (serverMessage === 'Email is already taken') {
          return 'That email address is already registered. Try signing in instead.';
        }
        if (serverMessage === 'Username is already taken') {
          return 'That username is already in use. Please choose another one.';
        }
        return 'That email address or username is already in use.';
      }
      return `We couldn't ${context} because it conflicts with existing data.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The service is temporarily unavailable. Please try again in a moment.';
    default:
      return `We couldn't ${context}. Please try again.`;
  }
}
