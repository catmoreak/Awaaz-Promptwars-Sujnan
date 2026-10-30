import type { UserDto } from '@awaaz/shared';
import { ChartNoAxesColumn, ListOrdered, LogOut, Map as MapIcon, Plus } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Logo } from '../shared/Logo';
import { AddReport } from './AddReport';
import { IssueDrawer } from './IssueDrawer';
import { MapPage } from './MapPage';
import { Queue } from './Queue';
import { Trends } from './Trends';
import './officer.css';

type View = 'queue' | 'map' | 'trends' | 'add';

const VIEWS: { id: View; label: string; icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[] = [
  { id: 'queue', label: 'Queue', icon: ListOrdered },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'trends', label: 'Trends', icon: ChartNoAxesColumn },
  { id: 'add', label: 'Add report', icon: Plus },
];

export function OfficerApp({ user, onSignOut }: { user: UserDto; onSignOut: () => void }) {
  const [view, setView] = useState<View>('queue');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Main">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} className="nav-item" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          <span className="account-name">{user.name}</span>
          <button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
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
