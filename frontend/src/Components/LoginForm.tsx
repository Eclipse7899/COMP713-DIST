import * as React from 'react';
import { useState } from 'react';
import { client } from '../client.ts';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    try {
      const result = await client.api.auth.login.$post({
        'json': {
          email,
          password,
        },
      });
      switch (result.status) {
        case 200:
          const data = await result.json();
          localStorage.setItem('token', data.accessToken);
          console.log('Logged in:', data.user.email);
          break;
        case 401:
          throw new Error('Invalid email or password');
        case 400:
          throw new Error('Account is disabled');
        default:
          const _exhaustiveCheck: never = result;
          return _exhaustiveCheck;
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div
      className="w-full max-w-md p-8 space-y-6 bg-(--bg) border border-(--border) rounded-2xl shadow-(--shadow)">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-(--text-h)">Welcome back</h1>
        <p className="text-(--text)">Enter your credentials to access your
          account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
            {error}
          </div>
        )}
        <div className="text-left space-y-2">
          <div>
            <label className="text-sm font-medium text-(--text-h)"
                   htmlFor="email">
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
              className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
          </div>
        </div>
        <div className="text-left space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-h)]"
                   htmlFor="password">
              Password
            </label>
            <a href="#"
               className="text-sm text-[var(--primary)] hover:underline">
              Forgot password?
            </a>
          </div>
          <div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-[var(--primary)] hover:bg-[var(--primary-soft)] hover:shadow-lg text-white font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          Sign in
        </button>
      </form>
      <div className="text-center text-sm">
        <p className="text-[var(--text)]">
          Don't have an account?{' '}
          <a href="#"
             className="font-medium text-[var(--primary)] hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}