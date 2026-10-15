import { useEffect, useState } from 'react';
import type { Dashboard } from '../types';
import { dateLong, num0, shiftName } from '../lib/format';
import { StatusChip } from './ui';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function verdict(k: NonNullable<Dashboard['kpis']>): string {
  if (k.outOfStockCount > 0)
    return `${k.outOfStockCount} ${plural(k.outOfStockCount, 'product is', 'products are')} out of stock`;
  if (k.lowStockCount > 0)
    return `${k.lowStockCount} ${plural(k.lowStockCount, 'product is', 'products are')} below the restock level`;
  if (k.thresholdsSet === 0) return 'No restock levels are set yet';
  return 'Every product is above its restock level';
}

export function Hero({ data }: { data: Dashboard }) {
  const k = data.kpis!;
  const p = data.period!;
  const online = Math.max(k.remaining.online, 0);
  const offline = Math.max(k.remaining.offline, 0);
  const target = online + offline > 0 ? (online / (online + offline)) * 100 : 50;

  // The one entrance animation: the split bar fills in on load.
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const moreLow = k.lowStockCount - k.outOfStockCount;

  return (
    <section className="grid gap-8 rounded-3xl border border-accent/30 bg-deep p-6 text-deep-ink sm:p-8 lg:grid-cols-[1fr_17rem]">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-deep-ink/75">
          <span>Latest period: {shiftName(p.shift)}, {dateLong(p.date)}</span>
          <StatusChip status={p.status} onDark />
        </div>

        <h1 className="display mt-4 max-w-2xl text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
          {verdict(k)}
        </h1>
        <p className="mt-3 text-deep-ink/80">
          {k.outOfStockCount > 0 && moreLow > 0
            ? `Another ${moreLow} ${plural(moreLow, 'is', 'are')} running low. `
            : ''}
          <span className="num">{num0(k.remaining.total)}</span> units on hand across{' '}
          <span className="num">{k.productsInStock}</span> of <span className="num">{k.activeProducts}</span> active products.
        </p>

        <div className="mt-7">
          <div
            className="flex h-3.5 overflow-hidden rounded-full bg-white/10"
            role="img"
            aria-label={`Online ${num0(online)} units, Offline ${num0(offline)} units`}
          >
            <div className="bg-[#facc15] motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out" style={{ width: `${pct}%` }} />
            <div className="flex-1 bg-[#d4d4d8]" />
          </div>
          <div className="mt-2.5 flex justify-between text-sm">
            <span><i className="mr-2 inline-block size-2.5 rounded-full bg-[#facc15]" />Online <b className="num font-semibold">{num0(online)}</b></span>
            <span>Offline <b className="num font-semibold">{num0(offline)}</b><i className="ml-2 inline-block size-2.5 rounded-full bg-[#d4d4d8]" /></span>
          </div>
        </div>
      </div>

      <dl className="self-end">
        {[
          ['Products in stock', `${k.productsInStock}`, false],
          ['Below restock level', `${k.lowStockCount}`, k.lowStockCount > 0],
          ['Out of stock', `${k.outOfStockCount}`, k.outOfStockCount > 0],
        ].map(([label, value, hot]) => (
          <div key={label as string} className="flex items-baseline justify-between border-t border-white/15 py-3">
            <dt className="text-sm text-deep-ink/75">{label}</dt>
            <dd className={`display num text-3xl font-bold ${hot ? 'text-[#ff8a78]' : ''}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
