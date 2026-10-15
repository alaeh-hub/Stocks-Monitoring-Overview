import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Dashboard } from '../types';
import { dateShort, num } from '../lib/format';
import { Panel } from './ui';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const tick = { fill: 'var(--muted)', fontSize: 12 };

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly { name?: string | number; value?: number | string; color?: string }[];
};

function FlowTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium">{dateShort(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center justify-between gap-6">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <i className="size-2 rounded-full" style={{ background: p.color }} /> {p.name}
          </span>
          <span className="num font-medium">{num(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function FlowChart({ trend }: { trend: NonNullable<Dashboard['trend']> }) {
  return (
    <Panel title="Stock flow, last 14 days" aside="units per day">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-muted/40" /> Produced</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-online" /> Fulfilled online</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-offline" /> Delivered offline</span>
      </div>
      <div role="img" aria-label="Daily production as bars, with lines for units fulfilled online and delivered offline over the last 14 days.">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={trend} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={dateShort} tick={tick} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
            <Tooltip content={<FlowTooltip />} cursor={{ fill: 'var(--line)', opacity: 0.4 }} />
            <Bar dataKey="production" name="Produced" fill="var(--muted)" fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
            <Line dataKey="fulfillment" name="Fulfilled online" stroke="var(--online)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line dataKey="delivery" name="Delivered offline" stroke="var(--offline)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
