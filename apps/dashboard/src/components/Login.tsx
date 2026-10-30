import { useState, type FormEvent } from 'react';
import { ApiError, api, session } from '../api';
import { Hexagon } from './Hexagon';

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      session.set((await api.login({ email, password })).token);
      onSignedIn();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login-form" onSubmit={(event) => void submit(event)}>
        <div className="brand">
          <Hexagon className="brand-mark" />
          <span>Awaaz</span>
        </div>
        <h1>Officer sign-in</h1>
        <label>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary" disabled={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
