import { STATUS_LABELS, type CitizenReportDto, type IssueStatus } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { api } from '../api';
import { Loader } from '../shared/Loader';
import { useLanguage } from '../shared/language';
import { STATUS_STEPS } from './MyReports';

function Steps({ status }: { status: IssueStatus }) {
  const { language } = useLanguage();
  if (status === 'REJECTED') return <p>{STATUS_LABELS.REJECTED[language]}</p>;

  const reached = STATUS_STEPS.indexOf(status);
  return (
    <ol className="steps-list">
      {STATUS_STEPS.map((step, index) => (
        <li key={step} data-done={index <= reached || undefined} data-current={index === reached || undefined}>
          <span className="step-dot">{index <= reached && <Check size={13} aria-hidden="true" />}</span>
          {STATUS_LABELS[step][language]}
        </li>
      ))}
    </ol>
  );
}

function Understanding({ report }: { report: CitizenReportDto }) {
  const { t } = useLanguage();
  const { analysis, issue } = report;
  if (!analysis) return null;

  return (
    <section className="citizen-card">
      <h2>{t.summary}</h2>
      <p>{analysis.summary}</p>
      {issue && (
        <p className={`priority-line band-${issue.priorityBand.toLowerCase()}`}>
          {t.priority}: <b>{issue.priorityBand.charAt(0) + issue.priorityBand.slice(1).toLowerCase()}</b>
        </p>
      )}
      {analysis.dedupe?.decision === 'MERGED' && issue && <p className="muted">{t.reportedBy(issue.reportCount)}</p>}
    </section>
  );
}

function Photo({ id }: { id: string }) {
  const image = useQuery({ queryKey: ['image', id], queryFn: () => api.image(id) });
  return image.data ? <img className="report-photo" src={image.data.dataUrl} alt="" /> : null;
}

export function ReportDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useLanguage();
  const report = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.report(id),
    // Fast while analysis runs, then slower while waiting for an officer.
    refetchInterval: (query) => (query.state.data?.processing === false ? 5_000 : 1_500),
  });

  const data = report.data;

  return (
    <div className="citizen-stack">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        {t.back}
      </button>

      {report.isError && <p className="form-error">{report.error.message}</p>}
      {report.isPending && <Loader />}

      {data?.processing && (
        <section className="citizen-card checking">
          <h2>{t.checking}</h2>
          <Loader />
        </section>
      )}

      {data?.issue && (
        <section className="citizen-card">
          <h2>{t.progress}</h2>
          <Steps status={data.issue.status} />
          {data.issue.teamName && (
            <p className="muted">
              {t.team}: {data.issue.teamName}
            </p>
          )}
        </section>
      )}

      {data && <Understanding report={data} />}

      {data?.issue && data.issue.timeline.length > 0 && (
        <section className="citizen-card">
          <h2>{t.updates}</h2>
          <ul className="updates">
            {[...data.issue.timeline].reverse().map((entry) => (
              <li key={entry.id}>
                <strong>{entry.message}</strong>
                {entry.note && <p>{entry.note}</p>}
                <time className="muted" dateTime={entry.at}>
                  {new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section className="citizen-card">
          <h2>{t.yourReport}</h2>
          <p>{data.text}</p>
          {data.hasImage && <Photo id={data.id} />}
        </section>
      )}
    </div>
  );
}
