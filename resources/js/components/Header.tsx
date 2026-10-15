import { Moon, RefreshCw, Sun } from 'lucide-react';
import { clock } from '../lib/format';

const btn =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-medium transition-colors hover:bg-line/50';

export function Header({
  updatedAt, refreshing, onRefresh, dark, onToggleTheme,
}: { updatedAt?: string; refreshing: boolean; onRefresh: () => void; dark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Ala Eh Food Products logo" width="44" height="44" className="size-11 rounded-full" />
        <div className="leading-tight">
          <p className="display text-base font-semibold">Ala Eh Food Products</p>
          <p className="text-sm text-muted">Stocks overview</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {updatedAt && <span className="num hidden text-sm text-muted sm:block">Updated {clock(updatedAt)}</span>}
        <button type="button" onClick={onRefresh} className={btn} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'motion-safe:animate-spin' : ''} aria-hidden />
          Refresh
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className={`${btn} px-0 w-9 justify-center`}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>
      </div>
    </header>
  );
}
