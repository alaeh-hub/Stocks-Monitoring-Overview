import type { ReactNode } from 'react';
import { CircleCheck, CircleDashed, Lock, LockOpen } from 'lucide-react';
import type { PeriodStatus } from '../types';

export function Panel({
  title, aside, children, className = '',
}: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      <header className="flex items-baseline justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="display text-lg font-semibold">{title}</h2>
        {aside !== undefined && <div className="text-sm text-muted">{aside}</div>}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

const STATUS = {
  open: { label: 'Open', Icon: CircleDashed, cls: 'text-muted border-line' },
  entries_locked: { label: 'Entries locked', Icon: Lock, cls: 'text-offline border-offline/40 bg-offline/10' },
  closed: { label: 'Closed', Icon: CircleCheck, cls: 'text-online border-online/40 bg-online/10' },
  unlocked: { label: 'Reopened', Icon: LockOpen, cls: 'text-alert border-alert/40 bg-alert/10' },
} as const;

export function StatusChip({ status, onDark = false }: { status: PeriodStatus; onDark?: boolean }) {
  const { label, Icon, cls } = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        onDark ? 'border-white/25 bg-white/10 text-deep-ink' : cls
      }`}
    >
      <Icon size={13} aria-hidden /> {label}
    </span>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-online" /> Online</span>
      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-offline" /> Offline</span>
    </div>
  );
}

/** Online and Offline stacked on one track, scaled against `max`. */
export function SplitBar({ online, offline, max }: { online: number; offline: number; max: number }) {
  const w = (v: number) => `${max > 0 ? Math.min(Math.max(v, 0) / max, 1) * 100 : 0}%`;
  return (
    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-line/60" aria-hidden>
      <div className="bg-online" style={{ width: w(online) }} />
      <div className="bg-offline" style={{ width: w(offline) }} />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>}
    </div>
  );
}
