import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChartNoAxesColumn, ListOrdered, LogOut, Map as MapIcon, Plus } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { ApiError, api, session } from './api';
import { AddReport } from './components/AddReport';
import { Hexagon } from './components/Hexagon';
import { IssueDrawer } from './components/IssueDrawer';
import { Loader } from './components/Loader';
import { Login } from './components/Login';
import { MapPage } from './components/MapPage';
import { Queue } from './components/Queue';
import { Trends } from './components/Trends';

type View = 'queue' | 'map' | 'trends' | 'add';

const VIEWS: { id: View; label: string; icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[] = [
  { id: 'queue', label: 'Priority queue', icon: ListOrdered },
  { id: 'map', label: 'Map and hotspots', icon: MapIcon },
  { id: 'trends', label: 'Trends', icon: ChartNoAxesColumn },
  { id: 'add', label: 'Add a report', icon: Plus },
];

export function App() {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(Boolean(session.get()));
  const [view, setView] = useState<View>('queue');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: signedIn, retry: false });

  const signOut = () => {
    session.clear();
    queryClient.clear();
    setSignedIn(false);
  };

  const sessionExpired = me.error instanceof ApiError && me.error.status === 401;
  if (!signedIn || sessionExpired) return <Login onSignedIn={() => setSignedIn(true)} />;
  if (me.isPending) return <Loader fullScreen />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Hexagon className="brand-mark" />
          <span>Awaaz</span>
        </div>
        <nav aria-label="Main">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} className="nav-item" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          <span className="account-name">{me.data?.name}</span>
          <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="page">
        {view === 'queue' && <Queue selectedIssueId={selectedIssueId} onSelectIssue={setSelectedIssueId} />}
        {view === 'map' && <MapPage selectedIssueId={selectedIssueId} onSelectIssue={setSelectedIssueId} />}
        {view === 'trends' && <Trends />}
        {view === 'add' && <AddReport onAdded={() => setView('queue')} />}
      </main>

      {selectedIssueId && (
        <IssueDrawer issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} onSelectIssue={setSelectedIssueId} />
      )}
    </div>
  );
}
