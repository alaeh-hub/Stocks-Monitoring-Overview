import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Dashboard } from '../types';
import { num0, pctChange } from '../lib/format';

function Delta({ now, prev }: { now: number; prev: number | null }) {
  const c = pctChange(now, prev);
  if (c === null) return <span>No earlier shift to compare</span>;
  const Icon = c >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={14} aria-hidden />
      <span className="num">{c > 0 ? '+' : ''}{c.toFixed(0)}%</span> vs previous shift
    </span>
  );
}

function Cell({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="display num mt-1 text-3xl font-bold">{value}</p>
      <div className="mt-1 text-sm text-muted">{children}</div>
    </div>
  );
}

export function StatStrip({ data }: { data: Dashboard }) {
  const k = data.kpis!;
  const m = data.movement!;
  const returned = m.online.rts + m.offline.backloads;
  const review = k.unpublishedCounts + k.pendingCorrections;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
      <Cell label="Produced" value={num0(k.productionIn.value)}>
        <Delta now={k.productionIn.value} prev={k.productionIn.previous} />
      </Cell>
      <Cell label="Shipped out" value={num0(k.outflow.value)}>
        <Delta now={k.outflow.value} prev={k.outflow.previous} />
      </Cell>
      <Cell label="Returned to stock" value={num0(returned)}>
        <span className="num">{num0(m.online.rts)}</span> RTS, <span className="num">{num0(m.offline.backloads)}</span> backloads
      </Cell>
      <Cell label="Needs review" value={num0(review)}>
        <span className="num">{k.unpublishedCounts}</span> counts to publish,{' '}
        <span className="num">{k.pendingCorrections}</span> corrections
      </Cell>
    </div>
  );
}
