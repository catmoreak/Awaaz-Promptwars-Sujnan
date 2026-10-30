import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: true } },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const app = (
  <QueryClientProvider client={queryClient}>
    <App googleEnabled={Boolean(googleClientId)} />
  </QueryClientProvider>
);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>{googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider> : app}</StrictMode>,
);
