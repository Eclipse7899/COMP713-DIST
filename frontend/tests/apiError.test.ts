import { describe, expect, it } from 'bun:test';
import { getApiErrorMessage } from '../src/apiError';

function apiError(
  statusCode: number,
  data?: { error?: unknown; message?: unknown },
) {
  return Object.assign(new Error('Request failed'), {
    statusCode,
    detail: { data },
  });
}

describe('getApiErrorMessage', () => {
  it('reports a temporarily unavailable service for 503 responses', () => {
    expect(getApiErrorMessage(apiError(503), 'load stocked items')).toBe(
      'The service is temporarily unavailable. Please try again in a moment.',
    );
  });

  it('reports a temporarily unavailable service for gateway failures', () => {
    expect(getApiErrorMessage(apiError(502), 'login')).toBe(
      'The service is temporarily unavailable. Please try again in a moment.',
    );
    expect(getApiErrorMessage(apiError(504), 'login')).toBe(
      'The service is temporarily unavailable. Please try again in a moment.',
    );
  });

  it('includes the requested action for server errors', () => {
    expect(getApiErrorMessage(apiError(500), 'delete item')).toBe(
      "We couldn't delete item because the server encountered an error. Please try again.",
    );
  });

  it('handles network failures without an HTTP status', () => {
    expect(getApiErrorMessage(new TypeError('Failed to fetch'), 'login')).toBe(
      "We couldn't login. Check your connection and try again.",
    );
  });

  it('uses a friendly message for invalid credentials', () => {
    expect(getApiErrorMessage(apiError(401), 'login')).toBe(
      'The email or password is incorrect.',
    );
  });

  it('uses the server message for invalid share requests', () => {
    expect(
      getApiErrorMessage(
        apiError(400, { error: 'Enter a valid email address' }),
        'share inventory',
      ),
    ).toBe('Enter a valid email address');
  });
});
