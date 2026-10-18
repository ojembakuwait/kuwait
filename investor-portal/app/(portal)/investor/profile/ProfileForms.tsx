'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile, addEntity, type ActionResult } from './actions';

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Notice({ state }: { state: ActionResult }) {
  if (!state.message) return null;
  return (
    <div
      role="status"
      className={`mb-3 rounded border px-3 py-2 text-sm ${
        state.ok
          ? 'border-success/30 bg-success/5 text-success'
          : 'border-danger/30 bg-danger/5 text-danger'
      }`}
    >
      {state.message}
    </div>
  );
}

export function ProfileForm({
  csrf,
  user,
}: {
  csrf: string;
  user: { firstName: string; lastName: string; phone: string; email: string };
}) {
  const [state, action] = useFormState<ActionResult, FormData>(updateProfile, {
    ok: false,
    message: '',
  });
  return (
    <form action={action} className="card max-w-xl p-5">
      <Notice state={state} />
      <input type="hidden" name="csrf" value={csrf} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="field-label">
            First name
          </label>
          <input id="firstName" name="firstName" defaultValue={user.firstName} className="field-input" />
        </div>
        <div>
          <label htmlFor="lastName" className="field-label">
            Last name
          </label>
          <input id="lastName" name="lastName" defaultValue={user.lastName} className="field-input" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" value={user.email} disabled className="field-input bg-canvas" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={user.phone} className="field-input" />
        </div>
      </div>
      <div className="mt-4">
        <Save label="Save profile" />
      </div>
    </form>
  );
}

export function AddEntityForm({ csrf }: { csrf: string }) {
  const [state, action] = useFormState<ActionResult, FormData>(addEntity, { ok: false, message: '' });
  return (
    <form action={action} className="card max-w-xl p-5">
      <Notice state={state} />
      <input type="hidden" name="csrf" value={csrf} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label htmlFor="name" className="field-label">
            Entity name
          </label>
          <input id="name" name="name" placeholder="e.g. Smith Family Trust" className="field-input" />
        </div>
        <div>
          <label htmlFor="type" className="field-label">
            Type
          </label>
          <select id="type" name="type" className="field-input">
            <option value="INDIVIDUAL">Individual</option>
            <option value="JOINT">Joint</option>
            <option value="ENTITY">Entity / LLC</option>
            <option value="TRUST">Trust</option>
            <option value="IRA">IRA</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <Save label="Add entity" />
      </div>
    </form>
  );
}
