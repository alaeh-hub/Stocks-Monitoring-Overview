import { DatabaseZap, PackageOpen } from 'lucide-react';
import type { ApiError } from '../types';

export function Skeleton() {
  const block = 'rounded-xl bg-line/60 motion-safe:animate-pulse';
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className={`${block} h-72 rounded-3xl`} />
      <div className={`${block} h-28`} />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className={`${block} h-80 lg:col-span-8`} />
        <div className={`${block} h-80 lg:col-span-4`} />
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-alert/40 bg-alert/5 p-8 text-center">
      <DatabaseZap className="mx-auto text-alert" size={32} aria-hidden />
      <h1 className="display mt-3 text-2xl font-bold">{error.message}</h1>
      {error.detail && <p className="mt-2 text-muted">{error.detail}</p>}
      <button type="button" onClick={onRetry}
        className="mt-5 h-10 rounded-lg bg-ink px-4 text-sm font-medium text-paper hover:opacity-90">
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ database }: { database: string }) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-line bg-panel p-8 text-center">
      <PackageOpen className="mx-auto text-muted" size={32} aria-hidden />
      <h1 className="display mt-3 text-2xl font-bold">No stock entries yet</h1>
      <p className="mt-2 text-muted">
        Connected to <b className="text-ink">{database}</b>, but the Online and Offline stock tables are empty.
        Encode a shift in Stocks Monitoring and this page fills in on the next refresh.
      </p>
    </div>
  );
}
