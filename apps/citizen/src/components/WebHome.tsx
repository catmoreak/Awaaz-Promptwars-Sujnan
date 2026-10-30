import type { ReactNode } from 'react';

/** The public home page exists on the website only, so the phone app opens straight to sign-in. */
export const hasWebHome = false;

export function WebHome(_props: { onSignIn: () => void; onRegister: () => void; onHome: () => void; children?: ReactNode }) {
  return null;
}
