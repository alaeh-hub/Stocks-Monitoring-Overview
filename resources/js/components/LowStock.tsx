import type { Dashboard } from '../types';
import { num } from '../lib/format';
import { Empty, Panel } from './ui';

// The gauge runs to 1.5x the restock level, so the tick sits at two thirds.
const TICK = 100 / 1.5;

function Gauge({ total, threshold, out }: { total: number; threshold: number; out: boolean }) {
  const scale = (threshold > 0 ? threshold : 1) * 1.5;
  const fill = Math.min(Math.max(total, 0) / scale, 1) * 100;
  return (
    <div className="relative mt-3 h-2 rounded-full bg-line/70" role="img"
      aria-label={`${num(total)} on hand, restock level ${num(threshold)}`}>
      <div className={`h-full rounded-full ${out ? 'bg-alert' : 'bg-offline'}`} style={{ width: `${fill}%` }} />
      <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `${TICK}%` }} title="Restock level" />
    </div>
  );
}

export function LowStock({ data }: { data: Dashboard }) {
  const k = data.kpis!;
  const rows = data.lowStock ?? [];
  const hidden = k.lowStockCount - rows.length;

  return (
    <Panel title="Restock watch" aside={`${k.lowStockCount} to restock`}>
      {rows.length === 0 ? (
        <Empty title={k.thresholdsSet === 0 ? 'No restock levels set' : 'Nothing to restock'}>
          {k.thresholdsSet === 0
            ? 'Set a low-stock level on a product in Stocks Monitoring and it will appear here.'
            : 'Every product with a restock level is above it.'}
        </Empty>
      ) : (
        <>
          <ul className="max-h-[26rem] space-y-2.5 overflow-y-auto pr-1">
            {rows.map((p) => {
              const out = p.status === 'out';
              return (
                <li key={p.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={p.name}>{p.name}</p>
                      <p className="truncate text-xs text-muted">{p.sku ?? 'No SKU'}, {p.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      out ? 'bg-alert/15 text-alert' : 'bg-offline/15 text-offline'}`}>
                      {out ? 'Out of stock' : 'Low'}
                    </span>
                  </div>
                  <Gauge total={p.total} threshold={p.threshold ?? 0} out={out} />
                  <p className="num mt-1.5 flex justify-between text-xs text-muted">
                    <span>{num(p.total)} {p.unit} on hand</span>
                    <span>Restock at {num(p.threshold ?? 0)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          {hidden > 0 && <p className="mt-3 text-sm text-muted">and {hidden} more below their restock level</p>}
        </>
      )}
    </Panel>
  );
}
