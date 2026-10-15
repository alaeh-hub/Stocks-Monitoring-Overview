const nf = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export const num = (n: number) => nf.format(n);
export const num0 = (n: number) => nf0.format(n);
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + nf.format(Math.abs(n));

/** 'YYYY-MM-DD' as a local calendar date (avoids the UTC off-by-one). */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export const dateLong = (d: string) =>
  parseDate(d).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const dateShort = (d: string) =>
  parseDate(d).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });

export const shiftName = (s: string) => (s === 'NIGHT' ? 'Night shift' : 'Morning shift');

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const secs = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit);
  }
  return 'just now';
}

export function pctChange(now: number, prev: number | null): number | null {
  if (prev === null || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}
