import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { api } from '../api';

export function ComparePanel({ a, b, onClose }: { a: string; b: string; onClose: () => void }) {
  const compare = useQuery({ queryKey: ['compare', a, b], queryFn: () => api.compare(a, b) });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const data = compare.data;
  const winner = data?.comparison.winner === 'b' ? data.b : data?.a;
  const loser = data?.comparison.winner === 'b' ? data.a : data?.b;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Priority comparison" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close comparison">
          <X size={18} />
        </button>

        {compare.isError && <p className="form-error">{compare.error.message}</p>}
        {compare.isPending && <p className="muted">Comparing the two issues</p>}

        {data && winner && loser && (
          <>
            <h2>{data.comparison.winner === 'tie' ? 'These two issues rank equally' : `${winner.code} ranks above ${loser.code}`}</h2>
            <p className="muted">{data.comparison.explanation}</p>
            {data.comparison.differences.length > 0 && (
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Factor</th>
                    <th scope="col" className="numeric">{winner.code}</th>
                    <th scope="col" className="numeric">{loser.code}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.differences.map((difference) => (
                    <tr key={difference.key}>
                      <th scope="row">{difference.label}</th>
                      <td className="numeric">{difference.winnerPoints}</td>
                      <td className="numeric">{difference.loserPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  );
}
