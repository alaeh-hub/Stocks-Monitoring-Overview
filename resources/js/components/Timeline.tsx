import { Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import type { Dashboard } from '../types';
import { dateShort, timeAgo } from '../lib/format';
import { Empty, Panel, StatusChip } from './ui';

export function Closures({ closures }: { closures: NonNullable<Dashboard['closures']> }) {
  return (
    <Panel title="Recent periods" aside="newest first">
      {closures.length === 0 ? (
        <Empty title="No periods closed yet">A period shows up here once a shift is finished or closed.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {closures.map((c) => {
            const Icon = c.shift === 'NIGHT' ? Moon : Sun;
            const hint = [c.closedBy && `By ${c.closedBy}`, c.unlockReason && `Reason: ${c.unlockReason}`]
              .filter(Boolean).join('. ');
            return (
              <li key={`${c.date}-${c.shift}`} className="rounded-lg border border-line p-3" title={hint || undefined}>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon size={15} className="text-muted" aria-hidden />
                  {dateShort(c.date)}
                  <span className="font-normal text-muted">{c.shift === 'NIGHT' ? 'Night' : 'Morning'}</span>
                </p>
                <div className="mt-2"><StatusChip status={c.status} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const TABLES: Record<string, string> = {
  daily_online_stock: 'an Online stock entry',
  daily_offline_stock: 'an Offline stock entry',
  manual_counts: 'a manual count',
  day_closures: 'a day closure',
  products: 'a product',
  users: 'a user',
  correction_requests: 'a correction request',
};

const ACTIONS = {
  CREATE: { verb: 'added', Icon: Plus, cls: 'bg-online/15 text-online' },
  UPDATE: { verb: 'edited', Icon: Pencil, cls: 'bg-offline/15 text-offline' },
  DELETE: { verb: 'deleted', Icon: Trash2, cls: 'bg-alert/15 text-alert' },
} as const;

export function Activity({ activity }: { activity: NonNullable<Dashboard['activity']> }) {
  return (
    <Panel title="Recent changes" aside="from the change log">
      {activity.length === 0 ? (
        <Empty title="No changes recorded yet" />
      ) : (
        <ul className="space-y-3">
          {activity.map((a) => {
            const { verb, Icon, cls } = ACTIONS[a.action];
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${cls}`}>
                  <Icon size={14} aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p>
                    <span className="font-medium">{a.user ?? 'The system'}</span> {verb} {TABLES[a.table] ?? a.table}
                  </p>
                  <p className="text-xs text-muted">{timeAgo(a.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
