import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useState } from 'react';
import { ApiError, api, session } from './api';
import { Home } from './public/Home';
import { Loader } from './shared/Loader';

// Loaded after sign-in, so the home page never downloads the map or the dashboard.
const CitizenApp = lazy(() => import('./citizen/CitizenApp').then((module) => ({ default: module.CitizenApp })));
const OfficerApp = lazy(() => import('./officer/OfficerApp').then((module) => ({ default: module.OfficerApp })));

/** One site for everyone: the signed-in account's role decides which side opens. */
export function App() {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(Boolean(session.get()));
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: signedIn, retry: false });

  const signOut = () => {
    session.clear();
    queryClient.clear();
    setSignedIn(false);
  };

  const sessionExpired = me.error instanceof ApiError && me.error.status === 401;
  if (!signedIn || sessionExpired) return <Home onSignedIn={() => setSignedIn(true)} />;
  if (!me.data) return <Loader fullScreen />;

  return (
    <Suspense fallback={<Loader fullScreen />}>
      {me.data.role === 'ADMIN' ? <OfficerApp user={me.data} onSignOut={signOut} /> : <CitizenApp user={me.data} onSignOut={signOut} />}
    </Suspense>
  );
}
