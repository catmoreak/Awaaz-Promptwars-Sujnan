import { CATEGORY_LABELS, STATUS_LABELS, type CitizenReportDto, type IssueStatus } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { api } from '../api';
import { Loader } from '../shared/Loader';
import { useLanguage } from '../shared/language';

export const STATUS_STEPS: IssueStatus[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

function ProgressBar({ status }: { status: IssueStatus | undefined }) {
  const reached = status ? STATUS_STEPS.indexOf(status) : -1;
  return (
    <span className="mini-progress" aria-hidden="true">
      {STATUS_STEPS.map((step, index) => (
        <i key={step} data-done={index <= reached || undefined} />
      ))}
    </span>
  );
}

function ReportRow({ report, onOpen }: { report: CitizenReportDto; onOpen: () => void }) {
  const { language, t } = useLanguage();
  return (
    <li>
      <button className="report-row" onClick={onOpen}>
        <span className="report-row-text">
          <strong>{report.analysis?.summary ?? report.text}</strong>
          <span className="report-row-meta">
            <ProgressBar status={report.issue?.status} />
            {report.issue ? STATUS_LABELS[report.issue.status][language] : t.checking}
            <span className="muted">{CATEGORY_LABELS[report.category][language]}</span>
          </span>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </li>
  );
}

export function MyReports({ name, onNew, onOpen }: { name: string; onNew: () => void; onOpen: (id: string) => void }) {
  const { t } = useLanguage();
  const reports = useQuery({ queryKey: ['reports'], queryFn: api.myReports, refetchInterval: 6_000 });

  return (
    <div className="citizen-stack">
      <h1>{t.hello(name.split(' ')[0] ?? name)}</h1>
      <button className="button button-primary button-large" onClick={onNew}>
        <Plus size={20} aria-hidden="true" />
        {t.report}
      </button>

      <h2>{t.myReports}</h2>
      {reports.isPending && <Loader />}
      {reports.isError && <p className="form-error">{reports.error.message}</p>}
      {reports.data?.length === 0 && <p className="muted">{t.noReports}</p>}
      <ul className="report-list">
        {reports.data?.map((report) => (
          <ReportRow key={report.id} report={report} onOpen={() => onOpen(report.id)} />
        ))}
      </ul>
    </div>
  );
}
