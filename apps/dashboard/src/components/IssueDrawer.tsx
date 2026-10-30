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
import { Bot, ImageIcon, ListChecks, Mic, Unlink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { BandTag, ScoreHex } from './Hexagon';

interface IssueDrawerProps {
  issueId: string;
  onClose: () => void;
  onSelectIssue: (id: string) => void;
}

function FactorRow({ factor }: { factor: PriorityFactor }) {
  return (
    <li className="factor">
      <div className="factor-line">
        <span>{factor.label}</span>
        <span className="factor-points">
          {factor.points} of {factor.maxPoints}
        </span>
      </div>
      <div className="factor-track" aria-hidden="true">
        <i style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }} />
      </div>
      <small>{factor.detail}</small>
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
        Show photo
      </button>
    );
  }
  if (image.isError) return <p className="form-error">{image.error.message}</p>;
  return image.data ? <img className="report-image" src={image.data.dataUrl} alt="Photo attached to this report" /> : <p>Loading photo</p>;
}

function ReportCard({
  report,
  canDetach,
  onDetach,
}: {
  report: AdminReportDto;
  canDetach: boolean;
  onDetach: () => void;
}) {
  const { analysis } = report;
  return (
    <li className="report-card">
      <div className="report-head">
        <strong>{report.code}</strong>
        <span>{report.channel ? `Staff entry: ${report.channel.toLowerCase()}` : report.source === 'SEED' ? 'Synthetic' : report.source === 'WEB' ? 'Web' : 'App'}</span>
        {report.viaVoice && (
          <span className="report-voice">
            <Mic size={13} aria-hidden="true" />
            Voice
          </span>
        )}
      </div>
      <p lang={analysis?.language === 'Kannada' ? 'kn' : undefined}>{report.text}</p>

      {analysis ? (
        <dl className="analysis">
          <div>
            <dt>Analysis by</dt>
            <dd className="analysis-source">
              {analysis.source === 'LLM' ? <Bot size={14} aria-hidden="true" /> : <ListChecks size={14} aria-hidden="true" />}
              {analysis.source === 'LLM' ? analysis.model : 'Keyword rules. No AI model was used, so review manually.'}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>
              {CATEGORY_LABELS[analysis.category].en} ({Math.round(analysis.confidence * 100)}% confident)
              {analysis.categoryChanged && `. The citizen chose ${CATEGORY_LABELS[report.userCategory].en}.`}
            </dd>
          </div>
          {analysis.language !== 'English' && (
            <div>
              <dt>Translation</dt>
              <dd>{analysis.englishText}</dd>
            </div>
          )}
          <div>
            <dt>Why this rating</dt>
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
              <dt>Photo check</dt>
              <dd>{analysis.imageNote}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="muted">Analysis is still running.</p>
      )}

      <div className="report-actions">
        {report.hasImage && <ReportImage reportId={report.id} />}
        {canDetach && (
          <button className="text-button" onClick={onDetach}>
            <Unlink size={15} aria-hidden="true" />
            Separate from this issue
          </button>
        )}
      </div>
    </li>
  );
}

function Workflow({ issue, onUpdated }: { issue: IssueDetailDto; onUpdated: () => void }) {
  const teams = useQuery({ queryKey: ['teams'], queryFn: api.teams });
  const [target, setTarget] = useState<IssueStatus | null>(null);
  const [teamId, setTeamId] = useState('');
  const [note, setNote] = useState('');

  const suggestedTeam = teams.data?.find((team) => team.categories.includes(issue.category));
  const chosenTeamId = teamId || suggestedTeam?.id || '';

  const transition = useMutation({
    mutationFn: () =>
      api.transition(issue.id, {
        to: target as IssueStatus,
        note: note.trim() || undefined,
        teamId: target === 'ASSIGNED' ? chosenTeamId : undefined,
      }),
    onSuccess: () => {
      setTarget(null);
      setNote('');
      onUpdated();
    },
  });

  const needsNote = target !== null && transitionNeedsNote(target);
  const canSubmit = target !== null && (!needsNote || note.trim().length > 0) && (target !== 'ASSIGNED' || chosenTeamId);

  return (
    <section className="drawer-section" aria-label="Update status">
      <h3>Move this issue forward</h3>
      <div className="transition-buttons">
        {issue.allowedTransitions.map((status) => (
          <button key={status} className="button" aria-pressed={target === status} onClick={() => setTarget(status)}>
            {STATUS_LABELS[status].en}
          </button>
        ))}
      </div>

      {target && (
        <div className="transition-form">
          {target === 'ASSIGNED' && (
            <label>
              Team
              <select value={chosenTeamId} onChange={(event) => setTeamId(event.target.value)}>
                {teams.data?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.openIssues} open)
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {needsNote ? 'Note for citizens (required)' : 'Note for citizens (optional)'}
            <textarea rows={2} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button className="button button-primary" disabled={!canSubmit || transition.isPending} onClick={() => transition.mutate()}>
            {transition.isPending ? 'Saving' : `Mark as ${STATUS_LABELS[target].en.toLowerCase()}`}
          </button>
          {transition.isError && <p className="form-error">{transition.error.message}</p>}
        </div>
      )}
    </section>
  );
}

function MergeControl({ issue, onMerged }: { issue: IssueDetailDto; onMerged: (id: string) => void }) {
  const issues = useQuery({ queryKey: ['issues'], queryFn: api.issues });
  const [intoId, setIntoId] = useState('');
  const options = issues.data?.filter(
    (candidate) => candidate.id !== issue.id && !['RESOLVED', 'REJECTED'].includes(candidate.status),
  );

  const merge = useMutation({
    mutationFn: () => api.merge(issue.id, intoId),
    onSuccess: (merged) => onMerged(merged.id),
  });

  return (
    <section className="drawer-section" aria-label="Merge duplicate">
      <h3>Is this a duplicate?</h3>
      <div className="merge-row">
        <select aria-label="Issue to merge into" value={intoId} onChange={(event) => setIntoId(event.target.value)}>
          <option value="">Choose the original issue</option>
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
    </section>
  );
}

export function IssueDrawer({ issueId, onClose, onSelectIssue }: IssueDrawerProps) {
  const queryClient = useQueryClient();
  const issue = useQuery({ queryKey: ['issue', issueId], queryFn: () => api.issue(issueId) });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refresh = () => void queryClient.invalidateQueries();

  const detach = useMutation({
    mutationFn: (reportId: string) => api.detach(issueId, reportId),
    onSuccess: refresh,
  });

  const data = issue.data;
  const isOpen = data && !['RESOLVED', 'REJECTED'].includes(data.status);

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-label={data ? `Issue ${data.code}` : 'Issue details'}>
      <button className="icon-button drawer-close" onClick={onClose} aria-label="Close issue details">
        <X size={18} />
      </button>

      {issue.isError && <p className="form-error">{issue.error.message}</p>}
      {!data && !issue.isError && <p className="muted">Loading issue</p>}

      {data && (
        <>
          <header className="drawer-head">
            <ScoreHex score={data.priority.score} band={data.priority.band} />
            <div>
              <p className="drawer-code">
                {data.code}
                {data.isSynthetic && ' (synthetic)'}
              </p>
              <h2>{data.title}</h2>
              <div className="queue-meta">
                <BandTag band={data.priority.band} />
                <span>{CATEGORY_LABELS[data.category].en}</span>
                <span>{STATUS_LABELS[data.status].en}</span>
                {data.teamName && <span>{data.teamName}</span>}
              </div>
            </div>
          </header>

          <p className="drawer-summary">{data.summary}</p>
          {data.address && <p className="muted">{data.address}</p>}

          <section className="drawer-section" aria-label="Why this score">
            <h3>Why this score</h3>
            <p>{data.priority.explanation}</p>
            <ul className="factors">
              {data.priority.factors.map((factor) => (
                <FactorRow key={factor.key} factor={factor} />
              ))}
            </ul>
          </section>

          {isOpen && <Workflow issue={data} onUpdated={refresh} />}
          {isOpen && (
            <MergeControl
              issue={data}
              onMerged={(id) => {
                refresh();
                onSelectIssue(id);
              }}
            />
          )}

          <section className="drawer-section" aria-label="Reports">
            <h3>{data.reports.length === 1 ? '1 citizen report' : `${data.reports.length} citizen reports`}</h3>
            {detach.isError && <p className="form-error">{detach.error.message}</p>}
            <ul className="reports">
              {data.reports.map((report) => (
                <ReportCard key={report.id} report={report} canDetach={data.reports.length > 1 && Boolean(isOpen)} onDetach={() => detach.mutate(report.id)} />
              ))}
            </ul>
          </section>

          <section className="drawer-section" aria-label="History">
            <h3>History</h3>
            <ol className="timeline">
              {data.timeline.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.message}</strong>
                  {entry.note && <p>{entry.note}</p>}
                  <time dateTime={entry.at}>{new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </aside>
  );
}
