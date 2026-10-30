import { CATEGORIES, CATEGORY_LABELS, LOGO_PATH, LOGO_VIEWBOX, OPEN_STATUSES, STATUS_LABELS } from '@awaaz/shared';
import { Eye, EyeOff, Phone, X } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, api, session } from '../api';
import { CATEGORY_ICONS } from '../shared/categories';
import { useLanguage } from '../shared/language';
import { CloudBank } from './CloudBank';
import './home.css';

// Loaded separately, so the 3D library never slows down the rest of the site.
const TempleScene = lazy(() => import('./TempleScene'));

/** Long enough for the text and buttons to paint before the 3D work starts. */
const SCENE_DELAY_MS = 200;

const REPORTABLE = CATEGORIES.filter((category) => category !== 'OTHER');
const TRACKED_STATUSES = [...OPEN_STATUSES, 'RESOLVED'] as const;

type Panel = 'none' | 'sign-in' | 'register';

function Brand() {
  return (
    <>
      <svg viewBox={LOGO_VIEWBOX} aria-hidden="true">
        <path d={LOGO_PATH} fillRule="evenodd" />
      </svg>
      Awaaz
    </>
  );
}

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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const registering = panel === 'register';

  const switchPanel = () => {
    setError(null);
    onPanel(registering ? 'sign-in' : 'register');
  };

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
      <div className="auth-heading">
        <h2 id="auth-title">{registering ? t.registerTitle : t.signInTitle}</h2>
        <p>{registering ? t.registerLead : t.signInLead}</p>
      </div>

      <div className={registering ? 'auth-row' : undefined}>
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
      </div>
      <div className="auth-field">
        <label htmlFor="auth-password">{t.password}</label>
        <div className="auth-password">
          <input
            id="auth-password"
            required
            type={passwordVisible ? 'text' : 'password'}
            minLength={registering ? 8 : undefined}
            autoComplete={registering ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={passwordVisible ? t.hidePassword : t.showPassword}
            title={passwordVisible ? t.hidePassword : t.showPassword}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {registering && <small>{t.passwordHint}</small>}
      </div>

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

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary" disabled={busy}>
        {busy ? (registering ? t.creatingAccount : t.signingIn) : registering ? t.createAccount : t.signIn}
      </button>
      <p className="auth-switch">
        {registering ? t.haveAccount : t.newHere}{' '}
        <button type="button" className="text-button" onClick={switchPanel}>
          {registering ? t.signIn : t.createAccount}
        </button>
      </p>
    </form>
  );
}

/** A native dialog, so focus stays inside it and Escape closes it without extra code. */
function AuthDialog({ panel, onPanel, onClose, onSignedIn }: { panel: Exclude<Panel, 'none'>; onPanel: (panel: Panel) => void; onClose: () => void; onSignedIn: () => void }) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Skipped on touch screens, where it would open the keyboard over the form.
    if (window.matchMedia('(pointer: fine)').matches) dialog?.querySelector('input')?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby="auth-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="auth-shell">
        <aside className="auth-aside">
          <span className="home-brand">
            <Brand />
          </span>
          <p>{t.tagline}</p>
          <ol>
            {t.steps.map(([title], index) => (
              <li key={title}>
                <span aria-hidden="true">{index + 1}</span>
                {title}
              </li>
            ))}
          </ol>
          <a className="auth-emergency" href="tel:112">
            <Phone size={16} aria-hidden="true" />
            {t.emergency}: {t.emergencyCall}
          </a>
          <div className="auth-aside-clouds">
            <CloudBank />
          </div>
        </aside>
        <div className="auth-main">
          <div className="auth-topbar">
            <span className="home-brand">
              <Brand />
            </span>
            <button className="icon-button" aria-label={t.close} title={t.close} onClick={() => dialogRef.current?.close()}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <AuthForm panel={panel} onPanel={onPanel} onSignedIn={onSignedIn} />
        </div>
      </div>
    </dialog>
  );
}

export function Home({ onSignedIn }: { onSignedIn: () => void }) {
  const { language, t, toggleLanguage } = useLanguage();
  const [panel, setPanel] = useState<Panel>('none');
  const [sceneWanted, setSceneWanted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const markReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSceneWanted(true), SCENE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const pageLinks = [
    ['#how-it-works', t.howItWorks],
    ['#what-to-report', t.whatToReport],
    ['#after-you-report', t.afterYouReport],
  ] as const;
  const languageSwitch = (
    <button className="home-link" lang={language === 'en' ? 'kn' : 'en'} onClick={toggleLanguage}>
      {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
    </button>
  );

  return (
    <div className="home" lang={language}>
      <section className={sceneReady ? 'home-hero scene-ready' : 'home-hero'}>
        <div className="home-scene">
          {sceneWanted && (
            <Suspense fallback={null}>
              <TempleScene onReady={markReady} paused={panel !== 'none'} />
            </Suspense>
          )}
        </div>

        <div className="home-clouds">
          <CloudBank />
        </div>

        <header className="home-header">
          <a className="home-brand" href="#top" id="top">
            <Brand />
          </a>
          <nav className="home-nav" aria-label={t.onThisPage}>
            {pageLinks.map(([href, label]) => (
              <a className="home-link" href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="home-header-actions">
            {languageSwitch}
            <button className="home-link" onClick={() => setPanel('sign-in')}>
              {t.signIn}
            </button>
          </div>
        </header>

        <div className="home-intro">
          <h1>{t.headline}</h1>
          <p>{t.lead}</p>
          <div className="home-actions">
            <button className="button button-primary" onClick={() => setPanel('register')}>
              {t.report}
            </button>
            <button className="button" onClick={() => setPanel('sign-in')}>
              {t.track}
            </button>
          </div>
        </div>
      </section>

      <main>
        <section className="home-section" id="how-it-works">
          <h2>{t.howItWorks}</h2>
          <ol className="home-steps">
            {t.steps.map(([title, text], index) => (
              <li key={title}>
                <span className="home-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="home-section home-split" id="what-to-report">
          <div>
            <h2>{t.whatToReport}</h2>
            <p>{t.otherCategory}</p>
          </div>
          <ul className="home-categories">
            {REPORTABLE.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <li key={category}>
                  <Icon size={20} aria-hidden="true" />
                  {CATEGORY_LABELS[category][language]}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="home-section" id="after-you-report">
          <h2>{t.afterYouReport}</h2>
          <div className="home-points">
            {t.afterPoints.map(([title, text]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <ol className="home-track">
            {TRACKED_STATUSES.map((status) => (
              <li key={status}>{STATUS_LABELS[status][language]}</li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-grid">
          <div className="home-footer-about">
            <span className="home-brand">
              <Brand />
            </span>
            <p>{t.tagline}</p>
          </div>
          <nav aria-label={t.onThisPage}>
            <h2>{t.onThisPage}</h2>
            <ul>
              {pageLinks.map(([href, label]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2>{t.yourAccount}</h2>
            <ul>
              <li>
                <button onClick={() => setPanel('sign-in')}>{t.signIn}</button>
              </li>
              <li>
                <button onClick={() => setPanel('register')}>{t.createAccount}</button>
              </li>
            </ul>
          </div>
          <div>
            <h2>{t.emergency}</h2>
            <a className="home-emergency" href="tel:112">
              <Phone size={18} aria-hidden="true" />
              {t.emergencyCall}
            </a>
            <p>{t.emergencyNote}</p>
          </div>
        </div>
        <div className="home-footer-base">
          <p>{t.notice}</p>
          {languageSwitch}
        </div>
      </footer>

      {panel !== 'none' && <AuthDialog panel={panel} onPanel={setPanel} onClose={() => setPanel('none')} onSignedIn={onSignedIn} />}
    </div>
  );
}
