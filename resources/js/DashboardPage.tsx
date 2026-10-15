import { useDashboard } from './hooks/useDashboard';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatStrip } from './components/StatStrip';
import { FlowChart } from './components/FlowChart';
import { Holdings } from './components/Holdings';
import { LowStock } from './components/LowStock';
import { Audit } from './components/Audit';
import { Activity, Closures } from './components/Timeline';
import { EmptyState, ErrorState, Skeleton } from './components/States';

export default function DashboardPage() {
  const { data, error, loading, refreshing, reload } = useDashboard();
  const { dark, toggle } = useTheme();
  const ready = data && !data.empty && data.kpis;

  return (
    <div className="min-h-screen">
      <Header
        updatedAt={data?.meta.generatedAt}
        refreshing={refreshing}
        onRefresh={reload}
        dark={dark}
        onToggleTheme={toggle}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 pb-12 sm:px-6">
        {loading && !data && <Skeleton />}
        {!data && error && <ErrorState error={error} onRetry={reload} />}
        {data?.empty && <EmptyState database={data.meta.database} />}

        {data && error && (
          <p role="alert" className="rounded-lg border border-offline/40 bg-offline/10 px-4 py-2 text-sm">
            Showing the last data we loaded. {error.detail}
          </p>
        )}

        {ready && (
          <>
            <Hero data={data} />
            <StatStrip data={data} />

            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <FlowChart trend={data.trend ?? []} />
                <Holdings data={data} />
              </div>
              <div className="space-y-5 lg:col-span-4">
                <LowStock data={data} />
                <Audit audit={data.audit} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
              <div className="lg:col-span-3"><Closures closures={data.closures ?? []} /></div>
              <div className="lg:col-span-2"><Activity activity={data.activity ?? []} /></div>
            </div>

            <p className="pt-2 text-sm text-muted">
              Reading <span className="font-medium text-ink">{data.meta.database}</span> in read-only mode.
              Totals add up each product in its own unit. This page refreshes every minute.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
