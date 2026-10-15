import type { Dashboard } from '../types';
import { dateShort, num, num0, shiftName, signed } from '../lib/format';
import { Empty, Panel } from './ui';

export function Audit({ audit }: { audit: Dashboard['audit'] }) {
  if (!audit) {
    return (
      <Panel title="Latest count audit">
        <Empty title="No manual counts yet">Counts appear here once someone records a physical count.</Empty>
      </Panel>
    );
  }

  const clean = audit.withVariance === 0;

  return (
    <Panel title="Latest count audit" aside={`${dateShort(audit.date)}, ${shiftName(audit.shift).replace(' shift', '')}`}>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="display num text-2xl font-bold">{num0(audit.withVariance)}<span className="text-base font-medium text-muted">/{num0(audit.totalCounts)}</span></p>
          <p className="text-muted">counts differ</p>
        </div>
        <div>
          <p className={`display num text-2xl font-bold ${audit.netVariance > 0 ? 'text-alert' : ''}`}>{signed(audit.netVariance)}</p>
          <p className="text-muted">net variance</p>
        </div>
        <div>
          <p className="display num text-2xl font-bold">{num0(audit.unpublished)}</p>
          <p className="text-muted">unpublished</p>
        </div>
      </div>

      {clean ? (
        <p className="mt-4 rounded-lg bg-online/10 px-3 py-2 text-sm text-online">Every count matches the system.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {audit.top.slice(0, 5).map((t, i) => {
            const short = t.variance > 0; // variance = system minus counted
            return (
              <li key={`${t.name}-${t.location}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={t.name}>{t.name}</p>
                  <p className="num truncate text-xs text-muted">
                    {t.location === 'ONLINE' ? 'Online' : t.location === 'OFFLINE' ? 'Offline' : 'Total'}: system {num(t.system)}, counted {num(t.counted)}
                  </p>
                </div>
                <span className={`num shrink-0 text-sm font-semibold ${short ? 'text-alert' : 'text-offline'}`}>
                  {short ? 'Short' : 'Over'} {num(Math.abs(t.variance))} {t.unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
