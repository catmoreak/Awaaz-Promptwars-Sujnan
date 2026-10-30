import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  transitionNeedsNote,
  type AdminReportDto,
  type IssueDetailDto,
  type IssueStatus,
  type PriorityFactor,
} from '@awaaz/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Mic, Unlink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loader } from '../shared/Loader';
import { ScoreHex } from './Hexagon';

type Tab = 'overview' | 'reports' | 'history';

interface IssueDrawerProps {
  issueId: string;
  onClose: () => void;
  onSelectIssue: (id: string) => void;
}

const ACTION_LABELS: Partial<Record<IssueStatus, string>> = {
  TRIAGED: 'Review',
  ASSIGNED: 'Assign',
  IN_PROGRESS: 'Start work',
  RESOLVED: 'Resolve',
  REJECTED: 'Close',
};

const actionLabel = (status: IssueStatus) => ACTION_LABELS[status] ?? STATUS_LABELS[status].en;

function FactorRow({ factor }: { factor: PriorityFactor }) {
  return (
    <li className="factor" title={factor.detail}>
      <div className="factor-line">
        <span>{factor.label}</span>
        <span className="muted">{factor.points}</span>
      </div>
      <div className="factor-track" aria-hidden="true">
        <i style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }} />
      </div>
    </li>
  );
}

function ReportImage({ reportId }: { reportId: string }) {
  const [visible, setVisible] = useState(false);
  const image = useQuery({ queryKey: ['image', reportId], queryFn: () => api.image(reportId), enabled: visible });

  if (!visible) {
    return (
      <button className="text-button" onClick={() => setVisible(true)}>
        <ImageIcon size={15} aria-hidden="true" />
        Photo
      </button>
    );
  }
  if (image.isError) return <p className="form-error">{image.error.message}</p>;
  return image.data ? <img className="report-image" src={image.data.dataUrl} alt="Attached to this report" /> : <Loader />;
}

function ReportCard({ report, canDetach, onDetach }: { report: AdminReportDto; canDetach: boolean; onDetach: () => void }) {
  const { analysis } = report;
  const translated = analysis && analysis.language !== 'English';

  return (
    <li className="report-card">
      <p lang={analysis?.language === 'Kannada' ? 'kn' : undefined}>{report.text}</p>
      {translated && <p className="muted">{analysis.englishText}</p>}

      {report.reporter && (
        <p className="report-contact">
          <span>{report.reporter.name}</span>
          {report.reporter.phone && <a href={`tel:+91${report.reporter.phone}`}>{report.reporter.phone}</a>}
        </p>
      )}

      <div className="report-actions">
        {report.viaVoice && (
          <span className="inline-icon muted">
            <Mic size={13} aria-hidden="true" />
            Voice
          </span>
        )}
        {report.hasImage && <ReportImage reportId={report.id} />}
        {canDetach && (
          <button className="text-button" onClick={onDetach}>
            <Unlink size={15} aria-hidden="true" />
            Separate
          </button>
        )}
      </div>

      {analysis && (
        <details className="ai-details">
          <summary>AI details</summary>
          <dl className="analysis">
            <div>
              <dt>{analysis.source === 'LLM' ? analysis.model : 'Keyword rules, not AI'}</dt>
              <dd>
                {CATEGORY_LABELS[analysis.category].en}, {Math.round(analysis.confidence * 100)}%
              </dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>{analysis.reasoning}</dd>
            </div>
            {analysis.dedupe && (
              <div>
                <dt>Duplicate check</dt>
                <dd>{analysis.dedupe.reason}</dd>
              </div>
            )}
            {analysis.imageNote && (
              <div>
                <dt>Photo</dt>
                <dd>{analysis.imageNote}</dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </li>
  );
}

/** Pinned to the bottom of the panel, so the next step is always in reach. */
function ActionBar({ issue, onUpdated }: { issue: IssueDetailDto; onUpdated: () => void }) {
  const teams = useQuery({ queryKey: ['teams'], queryFn: api.teams });
  const [target, setTarget] = useState<IssueStatus | null>(null);
  const [teamId, setTeamId] = useState('');
  const [note, setNote] = useState('');

  const suggestedTeam = teams.data?.find((team) => team.categories.includes(issue.category));
  const chosenTeamId = teamId || suggestedTeam?.id || '';

  const transition = useMutation({
    mutationFn: (to: IssueStatus) =>
      api.transition(issue.id, {
        to,
        note: note.trim() || undefined,
        teamId: to === 'ASSIGNED' ? chosenTeamId : undefined,
      }),
    onSuccess: () => {
      setTarget(null);
      setNote('');
      onUpdated();
    },
  });

  const needsNote = target !== null && transitionNeedsNote(target);
  const canSubmit = target !== null && (!needsNote || note.trim().length > 0) && (target !== 'ASSIGNED' || chosenTeamId);
  const [primary, ...others] = issue.allowedTransitions;

  // Only a team or a citizen note needs a second step. Everything else happens on the first click.
  const choose = (status: IssueStatus) => {
    if (status === 'ASSIGNED' || transitionNeedsNote(status)) setTarget(status);
    else transition.mutate(status);
  };

  return (
    <div className="action-bar">
      {target ? (
        <>
          {target === 'ASSIGNED' && (
            <label>
              Team
              <select value={chosenTeamId} onChange={(event) => setTeamId(event.target.value)}>
                {teams.data?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.openIssues})
                  </option>
                ))}
              </select>
            </label>
          )}
          {needsNote && (
            <label>
              Note for citizen
              <textarea rows={2} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
            </label>
          )}
          {transition.isError && <p className="form-error">{transition.error.message}</p>}
          <div className="action-row">
            <button className="button button-primary" disabled={!canSubmit || transition.isPending} onClick={() => transition.mutate(target)}>
              {transition.isPending ? 'Saving' : actionLabel(target)}
            </button>
            <button className="button" onClick={() => setTarget(null)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="action-row">
          {primary && (
            <button className="button button-primary" disabled={transition.isPending} onClick={() => choose(primary)}>
              {actionLabel(primary)}
            </button>
          )}
          {others.map((status) => (
            <button key={status} className="button" disabled={transition.isPending} onClick={() => choose(status)}>
              {actionLabel(status)}
            </button>
          ))}
          {transition.isError && <p className="form-error">{transition.error.message}</p>}
        </div>
      )}
    </div>
  );
}

function MergeControl({ issue, onMerged }: { issue: IssueDetailDto; onMerged: (id: string) => void }) {
  const issues = useQuery({ queryKey: ['issues'], queryFn: api.issues });
  const [intoId, setIntoId] = useState('');
  const options = issues.data?.filter((candidate) => candidate.id !== issue.id && !['RESOLVED', 'REJECTED'].includes(candidate.status));
  const merge = useMutation({ mutationFn: () => api.merge(issue.id, intoId), onSuccess: (merged) => onMerged(merged.id) });

  return (
    <details className="merge">
      <summary>Mark as duplicate</summary>
      <div className="merge-row">
        <select aria-label="Original issue" value={intoId} onChange={(event) => setIntoId(event.target.value)}>
          <option value="">Original issue</option>
          {options?.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.code}: {candidate.title}
            </option>
          ))}
        </select>
        <button className="button" disabled={!intoId || merge.isPending} onClick={() => merge.mutate()}>
          Merge
        </button>
      </div>
      {merge.isError && <p className="form-error">{merge.error.message}</p>}
    </details>
  );
}

export function IssueDrawer({ issueId, onClose, onSelectIssue }: IssueDrawerProps) {
  const queryClient = useQueryClient();
  const issue = useQuery({ queryKey: ['issue', issueId], queryFn: () => api.issue(issueId) });
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refresh = () => void queryClient.invalidateQueries();
  const detach = useMutation({ mutationFn: (reportId: string) => api.detach(issueId, reportId), onSuccess: refresh });

  const data = issue.data;
  const isOpen = data && !['RESOLVED', 'REJECTED'].includes(data.status);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'reports', label: data ? `Reports (${data.reports.length})` : 'Reports' },
    { id: 'history', label: 'History' },
  ];

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={data ? `Issue ${data.code}` : 'Issue details'}>
        <div className="drawer-scroll">
          <button className="icon-button drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>

          {issue.isError && <p className="form-error">{issue.error.message}</p>}
          {!data && !issue.isError && <Loader />}

          {data && (
            <>
              <header className="drawer-head">
                <ScoreHex score={data.priority.score} band={data.priority.band} />
                <div>
                  <h2>{data.title}</h2>
                  <p className="drawer-meta">
                    <span>{data.code}</span>
                    <span>{CATEGORY_LABELS[data.category].en}</span>
                    <span>{STATUS_LABELS[data.status].en}</span>
                    {data.teamName && <span>{data.teamName}</span>}
                  </p>
                </div>
              </header>

              <div className="tabs tabs-compact" role="tablist" aria-label="Issue details">
                {tabs.map((item) => (
                  <button key={item.id} role="tab" aria-selected={tab === item.id} className="tab" onClick={() => setTab(item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <section className="drawer-section">
                  {data.address && <p className="muted">{data.address}</p>}
                  <ul className="factors">
                    {data.priority.factors
                      .filter((factor) => factor.points > 0)
                      .map((factor) => (
                        <FactorRow key={factor.key} factor={factor} />
                      ))}
                  </ul>
                  {data.priority.safetyFloorApplied && <p className="muted">Danger to life: minimum score 75</p>}
                </section>
              )}

              {tab === 'reports' && (
                <section className="drawer-section">
                  {detach.isError && <p className="form-error">{detach.error.message}</p>}
                  <ul className="reports">
                    {data.reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        canDetach={data.reports.length > 1 && Boolean(isOpen)}
                        onDetach={() => detach.mutate(report.id)}
                      />
                    ))}
                  </ul>
                  {isOpen && (
                    <MergeControl
                      issue={data}
                      onMerged={(id) => {
                        refresh();
                        onSelectIssue(id);
                      }}
                    />
                  )}
                </section>
              )}

              {tab === 'history' && (
                <section className="drawer-section">
                  <ol className="timeline">
                    {data.timeline.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.message}</strong>
                        {entry.note && <p>{entry.note}</p>}
                        <time className="muted" dateTime={entry.at}>
                          {new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </time>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>

        {data && isOpen && <ActionBar issue={data} onUpdated={refresh} />}
      </aside>
    </>
  );
}
