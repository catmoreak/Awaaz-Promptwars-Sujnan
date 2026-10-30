import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './shared/language';
import './styles.css';

const queryClient = new QueryClient({
  // Retries ride out brief network drops, so nobody is left looking at stale data.
  defaultOptions: { queries: { staleTime: 5_000, retry: 3, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
);
