import * as React from 'react';
import { useMemo, useState } from 'react';
import { parseResponse } from 'hono/client';
import { getClient } from '../client';
import { getAuthentication } from '../util';
import { getApiErrorMessage } from '../apiError';
import ErrorMessage from './ErrorMessage';

export default function ShareStock() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const client = useMemo(() => getClient(), []);
  const userId = useMemo(() => getAuthentication()?.sub, []);

  const shareInventory = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Not authenticated');
      return;
    }

    setIsSubmitting(true);
    const res = await parseResponse(
      client.api.items[':userId'].shared.$post({
        param: { userId },
        json: { sharedWithEmail: email.trim() },
      }),
    ).catch((error: unknown) => {
      setError(getApiErrorMessage(error, 'share inventory'));
    });
    setIsSubmitting(false);

    if (!res) {
      return;
    }

    setSuccess(`Your stock is now shared with ${email.trim()}.`);
    setEmail('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-(--text-h)">
          Share your stock
        </h2>
        <p className="text-(--text)">
          Share your inventory with another user by email. They will be able to
          view your stocked items, but only you can change them.
        </p>
      </div>

      <div className="card flex flex-col gap-6 p-4">
        <ErrorMessage message={error} />

        {success && (
          <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/40 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={shareInventory} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="sharedWithEmail"
              className="text-sm font-medium text-(--text-h)"
            >
              Share with email
            </label>
            <input
              id="sharedWithEmail"
              className="w-full text-input"
              type="email"
              autoComplete="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <button type="submit" disabled={isSubmitting} className="btn">
              {isSubmitting ? 'Sharing...' : 'Share stock'}
            </button>
          </div>
        </form>
      </div>

      <p className="text-sm text-(--secondary)">
        The person you share with must already have an account. Sharing gives
        them read-only access to your stocked items.
      </p>
    </div>
  );
}
