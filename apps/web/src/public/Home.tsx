import { LOGO_PATH, LOGO_VIEWBOX } from '@awaaz/shared';
import { BadgeCheck, MapPin, Mic } from 'lucide-react';
import { Suspense, lazy, useCallback, useState, type FormEvent } from 'react';
import { ApiError, api, session } from '../api';
import { Loader } from '../shared/Loader';
import { useLanguage } from '../shared/language';
import './home.css';

// Loaded separately, so the 3D library never slows down the rest of the site.
const TempleScene = lazy(() => import('./TempleScene'));

const STEP_ICONS = [Mic, MapPin, BadgeCheck];

type Panel = 'none' | 'sign-in' | 'register';

function AuthForm({ panel, onPanel, onSignedIn }: { panel: Exclude<Panel, 'none'>; onPanel: (panel: Panel) => void; onSignedIn: () => void }) {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const registering = panel === 'register';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = registering
        ? await api.register({ name, phone: identifier, password, addressLine, locality, pincode })
        : await api.login(identifier.trim(), password);
      session.set(auth.token);
      onSignedIn();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.retry);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <h2>{registering ? t.createAccount : t.signIn}</h2>

      {registering && (
        <label>
          {t.fullName}
          <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      )}
      <label>
        {registering ? t.mobile : t.identifier}
        <input
          required
          autoComplete={registering ? 'tel' : 'username'}
          inputMode={registering ? 'tel' : 'text'}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </label>
      <label>
        {t.password}
        <input
          required
          type="password"
          minLength={registering ? 8 : undefined}
          autoComplete={registering ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {registering && <small>{t.passwordHint}</small>}
      </label>

      {registering && (
        <>
          <h3>{t.homeAddress}</h3>
          <label>
            {t.addressLine}
            <input required autoComplete="street-address" value={addressLine} onChange={(event) => setAddressLine(event.target.value)} />
          </label>
          <div className="auth-row">
            <label>
              {t.area}
              <input required value={locality} onChange={(event) => setLocality(event.target.value)} />
            </label>
            <label>
              {t.pincode}
              <input required inputMode="numeric" maxLength={6} autoComplete="postal-code" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            </label>
          </div>
        </>
      )}

      {error && <p className="auth-error">{error}</p>}
      <button className="button button-primary" disabled={busy}>
        {busy ? (registering ? t.creatingAccount : t.signingIn) : registering ? t.createAccount : t.signIn}
      </button>
      <button type="button" className="auth-switch" onClick={() => onPanel(registering ? 'sign-in' : 'register')}>
        {registering ? t.haveAccount : t.createAccount}
      </button>
    </form>
  );
}

export function Home({ onSignedIn }: { onSignedIn: () => void }) {
  const { language, t, toggleLanguage } = useLanguage();
  const [panel, setPanel] = useState<Panel>('none');
  const [sceneReady, setSceneReady] = useState(false);
  const markReady = useCallback(() => setSceneReady(true), []);
  const formOpen = panel !== 'none';

  return (
    <div className="home" lang={language}>
      {!sceneReady && <Loader fullScreen />}

      <section className={formOpen ? 'hero hero-form' : 'hero'}>
        <div className="hero-scene">
          <Suspense fallback={null}>
            <TempleScene onReady={markReady} />
          </Suspense>
        </div>
        <div className="hero-veil" />

        <header className="nav">
          <button className="home-brand" onClick={() => setPanel('none')}>
            <svg viewBox={LOGO_VIEWBOX} aria-hidden="true">
              <path d={LOGO_PATH} fillRule="evenodd" />
            </svg>
            Awaaz
          </button>
          <div className="nav-actions">
            <button className="link" onClick={toggleLanguage}>
              {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
            </button>
            {!formOpen && (
              <button className="link" onClick={() => setPanel('sign-in')}>
                {t.signIn}
              </button>
            )}
          </div>
        </header>

        {formOpen ? (
          <div className="form-stage">
            <div className="frost-panel">
              <AuthForm panel={panel} onPanel={setPanel} onSignedIn={onSignedIn} />
            </div>
          </div>
        ) : (
          <div className="hero-copy">
            <h1>
              {t.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p>{t.lead}</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => setPanel('register')}>
                {t.report}
              </button>
              <button className="button" onClick={() => setPanel('sign-in')}>
                {t.track}
              </button>
            </div>
          </div>
        )}

        <p className="hero-caption">{t.caption}</p>
      </section>

      {!formOpen && (
        <>
          <section className="steps">
            {t.steps.map(([title, text], index) => {
              const Icon = STEP_ICONS[index] ?? Mic;
              return (
                <div className="step" key={title}>
                  <Icon color="#D9B56A" size={26} aria-hidden="true" />
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              );
            })}
          </section>
          <footer className="footer">
            <p>{t.notice}</p>
          </footer>
        </>
      )}
    </div>
  );
}
