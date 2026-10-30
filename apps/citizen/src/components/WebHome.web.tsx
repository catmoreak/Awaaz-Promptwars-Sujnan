import { BadgeCheck, MapPin, Mic } from 'lucide-react-native';
import { Suspense, lazy, useCallback, useState, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Loader } from './Loader';
import './home.css';

// Loaded separately, so the 3D library never slows down the rest of the app.
const TempleScene = lazy(() => import('./TempleScene.web'));

const OFFICER_URL = process.env.EXPO_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173';
const LIME = '#C4F250';

const copy = {
  en: {
    signIn: 'Sign in',
    report: 'Report a problem',
    track: 'Track a report',
    lines: ['Moodbidri,', 'speak up.'],
    lead: 'Report a civic problem. Watch it get fixed.',
    steps: [
      ['Speak', 'Kannada or English'],
      ['Pin it', 'Exactly where it is'],
      ['See it fixed', 'Every step, live'],
    ],
    officers: 'Officer sign-in',
    notice: 'Independent prototype. Not an official municipal service. In an emergency, call 112.',
    caption: 'Thousand Pillar Temple, Moodbidri. Artistic 3D recreation.',
  },
  kn: {
    signIn: 'ಸೈನ್ ಇನ್',
    report: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    track: 'ವರದಿ ಗಮನಿಸಿ',
    lines: ['ಮೂಡುಬಿದಿರೆ,', 'ಧ್ವನಿ ಎತ್ತಿ.'],
    lead: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ. ಪರಿಹಾರ ನೋಡಿ.',
    steps: [
      ['ಮಾತನಾಡಿ', 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್'],
      ['ಸ್ಥಳ ಗುರುತಿಸಿ', 'ಅದು ಇರುವಲ್ಲೇ'],
      ['ಪರಿಹಾರ ನೋಡಿ', 'ಪ್ರತಿ ಹಂತವೂ'],
    ],
    officers: 'ಅಧಿಕಾರಿ ಸೈನ್ ಇನ್',
    notice: 'ಸ್ವತಂತ್ರ ಮಾದರಿ. ಅಧಿಕೃತ ಪುರಸಭೆ ಸೇವೆಯಲ್ಲ. ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ 112 ಕರೆ ಮಾಡಿ.',
    caption: 'ಸಾವಿರ ಕಂಬದ ಬಸದಿ, ಮೂಡುಬಿದಿರೆ. ಕಲಾತ್ಮಕ 3D ರಚನೆ.',
  },
};

const STEP_ICONS = [Mic, MapPin, BadgeCheck];

export const hasWebHome = true;

interface WebHomeProps {
  onSignIn: () => void;
  onRegister: () => void;
  onHome: () => void;
  /** The sign-in form. When present it sits over the temple in a frosted panel. */
  children?: ReactNode;
}

export function WebHome({ onSignIn, onRegister, onHome, children }: WebHomeProps) {
  const { language, toggleLanguage } = useLanguage();
  const [sceneReady, setSceneReady] = useState(false);
  const markReady = useCallback(() => setSceneReady(true), []);
  const t = copy[language];
  const formOpen = Boolean(children);

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
          <button className="brand" onClick={onHome}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" />
            </svg>
            Awaaz
          </button>
          <div className="nav-actions">
            <button className="link" onClick={toggleLanguage}>
              {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
            </button>
            {!formOpen && (
              <button className="link" onClick={onSignIn}>
                {t.signIn}
              </button>
            )}
          </div>
        </header>

        {formOpen ? (
          <div className="form-stage">
            <div className="frost-panel">{children}</div>
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
              <button className="button button-primary" onClick={onRegister}>
                {t.report}
              </button>
              <button className="button" onClick={onSignIn}>
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
                  <Icon color={LIME} size={26} />
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              );
            })}
          </section>

          <footer className="footer">
            <p>{t.notice}</p>
            <a className="link" href={OFFICER_URL}>
              {t.officers}
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
