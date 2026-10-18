'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, type LoginState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} aria-busy={pending}>
      {pending ? 'Signing in…' : 'Log In'}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} noValidate className="mt-6">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div
          role="alert"
          className="mb-4 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field-input"
        />
      </div>

      <div className="mb-2">
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
        />
      </div>

      <div className="mb-5 text-right">
        <a href="/forgot-password" className="link text-base">
          Forgot password?
        </a>
      </div>

      <div className="flex items-center justify-between">
        <SubmitButton />
        <a
          href="https://www.cardonecapital.com"
          target="_blank"
          rel="noreferrer noopener"
          className="link text-base"
        >
          Knowledge Base ↗
        </a>
      </div>
    </form>
  );
}
