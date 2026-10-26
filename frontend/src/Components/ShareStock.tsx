import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseResponse } from 'hono/client';
import { getClient } from '../client';
import { getAuthentication } from '../util';
import { getApiErrorMessage } from '../apiError';
import ErrorMessage from './ErrorMessage';
import type { SharedUser } from '../models';

export default function ShareStock() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [removingUserId, setRemovingUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const client = useMemo(() => getClient(), []);
  const userId = useMemo(() => getAuthentication()?.sub, []);

  const loadSharedUsers = useCallback(async () => {
    if (!userId) {
      setError('Not authenticated');
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    const shares = await parseResponse(
      client.api.items[':userId'].shared.$get({
        param: { userId },
      }),
    ).catch((error: unknown) => {
      setError(getApiErrorMessage(error, 'load shared users'));
    });
    setIsLoadingUsers(false);

    if (!shares) {
      return;
    }

    setSharedUsers(shares);
  }, [client, userId]);

  useEffect(() => {
    void loadSharedUsers();
  }, [loadSharedUsers]);

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

    setSharedUsers((current) =>
      current.some(
        (share) => share.sharedWithUserId === res.data.sharedWithUserId,
      )
        ? current
        : [res.data, ...current],
    );
    setSuccess(`Your stock is now shared with ${email.trim()}.`);
    setEmail('');
  };

  const removeSharedUser = async (sharedWithUserId: string) => {
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Not authenticated');
      return;
    }

    setRemovingUserId(sharedWithUserId);
    const res = await parseResponse(
      client.api.items[':userId'].shared[':sharedWithUserId'].$delete({
        param: { userId, sharedWithUserId },
      }),
    ).catch((error: unknown) => {
      setError(getApiErrorMessage(error, 'remove shared user'));
    });
    setRemovingUserId('');

    if (!res) {
      return;
    }

    setSharedUsers((current) =>
      current.filter((share) => share.sharedWithUserId !== sharedWithUserId),
    );
    setSuccess('That user can no longer view your stock.');
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

      <ErrorMessage message={error} />

      {success && (
        <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/40 rounded-lg">
          {success}
        </div>
      )}

      <div className="card flex flex-col gap-6 p-4">
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

      <div className="card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-(--text-h)">
            People you have shared with
          </h3>
          <p className="text-sm text-(--text)">
            Remove someone to stop them viewing your stock.
          </p>
        </div>

        {isLoadingUsers ? (
          <p className="py-2 text-sm text-(--secondary)">
            Loading shared users...
          </p>
        ) : sharedUsers.length === 0 ? (
          <p className="py-2 text-sm text-(--secondary)">
            You have not shared your stock with anyone yet.
          </p>
        ) : (
          <ul className="divide-y divide-(--border)">
            {sharedUsers.map((share) => (
              <li
                key={share.sharedWithUserId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium text-(--text-h)">
                    {share.sharedWithUsername}
                  </span>
                  <span className="text-xs text-(--secondary)">
                    Shared since {new Date(share.sharedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSharedUser(share.sharedWithUserId)}
                  disabled={removingUserId === share.sharedWithUserId}
                  className="btn-danger"
                >
                  {removingUserId === share.sharedWithUserId
                    ? 'Removing...'
                    : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-(--secondary)">
        The person you share with must already have an account. Sharing gives
        them read-only access to your stocked items.
      </p>
    </div>
  );
}
