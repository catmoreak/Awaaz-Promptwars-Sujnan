import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../api';

export function ComparePanel({ a, b, onClose }: { a: string; b: string; onClose: () => void }) {
  const compare = useQuery({ queryKey: ['compare', a, b], queryFn: () => api.compare(a, b) });

  if (compare.isError) return <p className="form-error">{compare.error.message}</p>;
  if (!compare.data) return <div className="compare-panel">Comparing the two issues</div>;

  const { a: first, b: second, comparison } = compare.data;
  const winner = comparison.winner === 'b' ? second : first;
  const loser = comparison.winner === 'b' ? first : second;

  return (
    <aside className="compare-panel" aria-label="Priority comparison">
      <button className="icon-button compare-close" onClick={onClose} aria-label="Close comparison">
        <X size={16} />
      </button>
      {comparison.winner === 'tie' ? (
        <h2>These two issues rank equally</h2>
      ) : (
        <h2>
          {winner.code} ranks above {loser.code}
        </h2>
      )}
      <p>{comparison.explanation}</p>
      {comparison.differences.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Factor</th>
              <th scope="col">{winner.code}</th>
              <th scope="col">{loser.code}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.differences.map((difference) => (
              <tr key={difference.key}>
                <th scope="row">{difference.label}</th>
                <td>{difference.winnerPoints}</td>
                <td>{difference.loserPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
