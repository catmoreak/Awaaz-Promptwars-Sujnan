import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const googleSignInAvailable = Boolean(WEB_CLIENT_ID);

export function GoogleButton({ onIdToken }: { onIdToken: (idToken: string) => void }) {
  if (!WEB_CLIENT_ID) return null;

  return (
    <GoogleOAuthProvider clientId={WEB_CLIENT_ID}>
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) onIdToken(response.credential);
        }}
      />
    </GoogleOAuthProvider>
  );
}
