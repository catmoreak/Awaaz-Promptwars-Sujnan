import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { ApiError, api, session } from './api';
import { AddReport } from './components/AddReport';
import { Hexagon } from './components/Hexagon';
import { Insights } from './components/Insights';
import { IssueDrawer } from './components/IssueDrawer';
import { Login } from './components/Login';
import { Triage } from './components/Triage';

type View = 'triage' | 'insights' | 'add';

const VIEWS: { id: View; label: string }[] = [
  { id: 'triage', label: 'Priority queue' },
  { id: 'insights', label: 'Hotspots and trends' },
  { id: 'add', label: 'Add a report' },
];

export function App({ googleEnabled }: { googleEnabled: boolean }) {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(Boolean(session.get()));
  const [view, setView] = useState<View>('triage');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: signedIn,
    retry: false,
  });

  const signOut = () => {
    session.clear();
    queryClient.clear();
    setSignedIn(false);
  };

  const sessionExpired = me.error instanceof ApiError && me.error.status === 401;
  if (!signedIn || sessionExpired) {
    return <Login googleEnabled={googleEnabled} onSignedIn={() => setSignedIn(true)} />;
  }

  if (me.data && me.data.role !== 'ADMIN') {
    return (
      <main className="centered-message">
        <h1>This account is not an officer account</h1>
        <p>{me.data.email} can report issues in the Awaaz app. Ask your administrator to add this email to the officer list.</p>
        <button className="button" onClick={signOut}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <Hexagon className="brand-mark" />
          <div>
            <strong>Awaaz</strong>
            <span>Moodbidri officer desk</span>
          </div>
        </div>
        <nav aria-label="Main">
          {VIEWS.map((item) => (
            <button key={item.id} className="nav-item" aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account">
          <span>{me.data?.name}</span>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="workspace">
        {view === 'triage' && <Triage selectedIssueId={selectedIssueId} onSelectIssue={setSelectedIssueId} />}
        {view === 'insights' && <Insights onSelectIssue={setSelectedIssueId} />}
        {view === 'add' && <AddReport onAdded={() => setView('triage')} />}
      </main>

      {selectedIssueId && (
        <IssueDrawer issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} onSelectIssue={setSelectedIssueId} />
      )}
    </div>
  );
}
