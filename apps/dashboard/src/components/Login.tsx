import { GoogleLogin } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, api, session } from '../api';
import { Hexagon } from './Hexagon';

export function Login({ googleEnabled, onSignedIn }: { googleEnabled: boolean; onSignedIn: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });

  const complete = async (login: Promise<{ token: string }>) => {
    setError(null);
    try {
      session.set((await login).token);
      onSignedIn();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Sign-in failed. Try again.');
    }
  };

  return (
    <main className="login">
      <div className="login-panel">
        <Hexagon className="login-mark" />
        <h1>Awaaz</h1>
        <p>Choose what Moodbidri fixes first, and show citizens what happened next.</p>

        {googleEnabled && (
          <GoogleLogin
            onSuccess={(response) => {
              if (response.credential) void complete(api.loginGoogle(response.credential));
            }}
            onError={() => setError('Google Sign-In did not complete. Try again.')}
          />
        )}

        {config.data?.demoLoginEnabled && (
          <div className="demo-login">
            <button className="button button-primary" onClick={() => void complete(api.loginDemo())}>
              Open the demo officer desk
            </button>
            <small>Demo sign-in for local testing. It is off in production.</small>
          </div>
        )}

        {!googleEnabled && !config.data?.demoLoginEnabled && !config.isLoading && (
          <p className="form-error">Sign-in is not set up. Add a Google client ID to continue.</p>
        )}
        {config.isError && <p className="form-error">The Awaaz server cannot be reached. Start the API and reload.</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    </main>
  );
}
