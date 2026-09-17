import * as React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { saveJwt } from '../../util.ts';
import { getClient } from '../client.ts';
import { APP_NAME } from '../constants';
import { type DetailedError, parseResponse } from 'hono/client';

export default function SignupForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const client = React.useMemo(() => getClient(), []);
  const navigate = useNavigate();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const result = await parseResponse(await client.api.auth.register.$post({
        json: {
          username,
          email,
          password,
        },
      })).catch((err: DetailedError) => {
        switch (err.statusCode) {
          case 400:
            throw new Error('Please check your inputs and try again.');
          case 409:
            throw new Error('Email or username already exists');
          default:
            throw new Error('Failed to parse response');
        }
      }).then((res) => {
        return res;
      });

      saveJwt(result.accessToken);
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-(--bg) border border-(--border) rounded-2xl shadow-(--shadow)">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-(--text-h)">Create an account</h1>
        <p className="text-(--text)">
          Sign up to get started with {APP_NAME}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
            {error}
          </div>
        )}
        <div className="text-left space-y-2">
          <div>
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="username"
            >
              Username
            </label>
          </div>
          <div>
            <input
              id="username"
              type="text"
              placeholder="myusername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="w-full px-4 py-2 bg-(--bg) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all"
            />
          </div>
        </div>
        <div className="text-left space-y-2">
          <div>
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="email"
            >
              Email address
            </label>
          </div>
          <div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-(--bg) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all"
            />
          </div>
        </div>
        <div className="text-left space-y-2">
          <div>
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="password"
            >
              Password
            </label>
          </div>
          <div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-(--bg) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all"
            />
          </div>
        </div>
        <div className="text-left space-y-2">
          <div>
            <label
              className="text-sm font-medium text-(--text-h)"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
          </div>
          <div>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-(--bg) border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary) transition-all"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-(--primary) hover:bg-(--primary-soft) hover:shadow-lg text-white font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <div className="text-center text-sm">
        <p className="text-(--text)">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-(--primary) hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
