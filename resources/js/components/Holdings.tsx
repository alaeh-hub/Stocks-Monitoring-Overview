import type { Dashboard } from '../types';
import { num0 } from '../lib/format';
import { Empty, Legend, Panel, SplitBar } from './ui';

export function Holdings({ data }: { data: Dashboard }) {
  const top = data.topProducts ?? [];
  const cats = data.categories ?? [];
  const topMax = Math.max(...top.map((p) => p.total), 0);
  const catMax = Math.max(...cats.map((c) => c.total), 0);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Panel title="Largest stock holdings" aside={<Legend />}>
        {top.length === 0 ? (
          <Empty title="No stock on hand" />
        ) : (
          <ul className="space-y-3.5">
            {top.map((p) => (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium" title={p.name}>{p.name}</span>
                  <span className="num shrink-0 text-sm">{num0(p.total)} <span className="text-muted">{p.unit}</span></span>
                </div>
                <SplitBar online={p.online} offline={p.offline} max={topMax} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="By category" aside={<Legend />}>
        {cats.length === 0 ? (
          <Empty title="No categories yet" />
        ) : (
          <ul className="space-y-3.5">
            {cats.slice(0, 8).map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium" title={c.category}>
                    {c.category} <span className="font-normal text-muted">({c.products})</span>
                  </span>
                  <span className="num shrink-0 text-sm">{num0(c.total)}</span>
                </div>
                <SplitBar online={c.online} offline={c.offline} max={catMax} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
