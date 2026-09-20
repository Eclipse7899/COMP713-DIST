import * as React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getClient } from '../../client.ts';
import { saveJwt } from '../../util.ts';
import ErrorMessage from '../ErrorMessage.tsx';
import { parseResponse } from 'hono/client';
import { getApiErrorMessage } from '../../apiError.ts';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const client = React.useMemo(() => getClient(), []);
  const navigate = useNavigate();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await parseResponse(
        await client.api.auth.login.$post({
          json: {
            email,
            password,
          },
        }),
      ).catch((err: unknown) => {
        throw new Error(getApiErrorMessage(err, 'login'));
      });

      if (result?.accessToken) {
        saveJwt(result.accessToken);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err, 'login'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md card flex flex-col gap-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-(--text-h)">Welcome back</h1>
        <p className="text-(--text) text-sm">
          Enter your credentials to access your account
        </p>
      </div>

      <ErrorMessage message={error}/>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left space-y-1.5">
          <label className="text-sm font-medium text-(--text-h)"
                 htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full text-input"
          />
        </div>

        <div className="text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-(--text-h)"
                   htmlFor="password">
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full text-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center text-sm">
        <p className="text-(--text)">
          Don't have an account?{' '}
          <Link to="/signup"
                className="font-medium text-(--primary) hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}