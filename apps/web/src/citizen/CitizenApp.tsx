import type { UserDto } from '@awaaz/shared';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '../shared/Logo';
import { useLanguage } from '../shared/language';
import { MyReports } from './MyReports';
import { NewReport } from './NewReport';
import { ReportDetail } from './ReportDetail';
import './citizen.css';

type Screen = { name: 'list' } | { name: 'new' } | { name: 'report'; id: string };

export function CitizenApp({ user, onSignOut }: { user: UserDto; onSignOut: () => void }) {
  const { language, t, toggleLanguage } = useLanguage();
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  return (
    <div className="citizen" lang={language}>
      <header className="citizen-bar">
        <button className="citizen-home" onClick={() => setScreen({ name: 'list' })} aria-label={t.back}>
          <Logo />
        </button>
        <div className="citizen-actions">
          <button className="citizen-link" onClick={toggleLanguage}>
            {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
          </button>
          <button className="icon-button" onClick={onSignOut} aria-label={t.signOut} title={t.signOut}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="citizen-page">
        {screen.name === 'list' && (
          <MyReports
            name={user.name}
            onNew={() => setScreen({ name: 'new' })}
            onOpen={(id) => setScreen({ name: 'report', id })}
          />
        )}
        {screen.name === 'new' && <NewReport onSent={(id) => setScreen({ name: 'report', id })} />}
        {screen.name === 'report' && <ReportDetail id={screen.id} onBack={() => setScreen({ name: 'list' })} />}
      </main>
    </div>
  );
}
