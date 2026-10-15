<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;

/**
 * Reads the Stocks Monitoring database (Prisma-owned) and shapes it into the
 * one payload the dashboard needs. Everything here is read only.
 *
 * Shift order inside a date is MORNING then NIGHT, and a date's MORNING follows
 * the previous date's NIGHT, so "latest" always means highest (entryDate, shift).
 */
class StockDashboardService
{
    /** Only look this far back for each product's latest remaining stock. */
    private const LOOKBACK_DAYS = 90;

    private const TREND_DAYS = 14;

    private function db(): ConnectionInterface
    {
        return DB::connection('stocks');
    }

    public function build(): array
    {
        $db = $this->db();
        $period = $this->latestPeriod();

        $base = [
            'meta' => [
                'generatedAt' => CarbonImmutable::now('UTC')->toIso8601ZuluString(),
                'database' => $db->getDatabaseName(),
                'lookbackDays' => self::LOOKBACK_DAYS,
            ],
            'period' => null,
        ];

        if ($period === null) {
            return $base + ['empty' => true];
        }

        $previous = $this->previousPeriod($period);
        $now = $this->movement($period['date'], $period['shift']);
        $before = $this->movement($previous['date'], $previous['shift']);

        $products = $this->productStock($period['date']);
        $stockSummary = $this->summariseStock($products);

        $closure = $db->table('day_closures')
            ->where('entryDate', $period['date'])->where('shift', $period['shift'])->first();

        $audit = $this->audit();

        return array_merge($base, [
            'empty' => false,
            'period' => $period + [
                'status' => $this->closureStatus($closure),
                'closedAt' => $closure?->closedAt ? $this->iso($closure->closedAt) : null,
                'previous' => $previous,
            ],
            'kpis' => [
                'remaining' => [
                    'total' => $stockSummary['total'],
                    'online' => $stockSummary['online'],
                    'offline' => $stockSummary['offline'],
                ],
                'activeProducts' => count($products),
                'productsInStock' => $stockSummary['inStock'],
                'thresholdsSet' => $stockSummary['thresholds'],
                'lowStockCount' => $stockSummary['lowCount'],
                'outOfStockCount' => $stockSummary['outCount'],
                'productionIn' => [
                    'value' => $now['online']['productionIn'] + $now['offline']['productionIn'],
                    'previous' => $before['entries'] ? $before['online']['productionIn'] + $before['offline']['productionIn'] : null,
                ],
                'outflow' => [
                    'value' => $now['online']['fulfillmentOut'] + $now['offline']['deliveryOut'],
                    'previous' => $before['entries'] ? $before['online']['fulfillmentOut'] + $before['offline']['deliveryOut'] : null,
                ],
                'pendingCorrections' => (int) $db->table('correction_requests')->where('status', 'PENDING')->count(),
                'unpublishedCounts' => (int) $db->table('manual_counts')->whereNull('publishedAt')->count(),
            ],
            'movement' => ['online' => $now['online'], 'offline' => $now['offline']],
            'trend' => $this->trend($period['date']),
            'topProducts' => $stockSummary['top'],
            'categories' => $stockSummary['categories'],
            'lowStock' => $stockSummary['low'],
            'audit' => $audit,
            'closures' => $this->closures(),
            'activity' => $this->activity(),
        ]);
    }

    // ---------------------------------------------------------------- periods

    /** @return array{date: string, shift: string}|null */
    private function latestPeriod(): ?array
    {
        $db = $this->db();
        $date = collect([
            $db->table('daily_online_stock')->max('entryDate'),
            $db->table('daily_offline_stock')->max('entryDate'),
        ])->filter()->max();

        if (! $date) {
            return null;
        }
        $date = substr((string) $date, 0, 10);

        $shifts = $db->table('daily_online_stock')->where('entryDate', $date)->distinct()->pluck('shift')
            ->merge($db->table('daily_offline_stock')->where('entryDate', $date)->distinct()->pluck('shift'));

        return ['date' => $date, 'shift' => $shifts->contains('NIGHT') ? 'NIGHT' : 'MORNING'];
    }

    private function previousPeriod(array $p): array
    {
        return $p['shift'] === 'NIGHT'
            ? ['date' => $p['date'], 'shift' => 'MORNING']
            : ['date' => CarbonImmutable::parse($p['date'])->subDay()->toDateString(), 'shift' => 'NIGHT'];
    }

    private function closureStatus(?object $c): string
    {
        return match (true) {
            $c === null => 'open',
            ! $c->isClosed => 'unlocked',
            (bool) $c->entriesOnly => 'entries_locked',
            default => 'closed',
        };
    }

    // --------------------------------------------------------------- movement

    private function movement(string $date, string $shift): array
    {
        $db = $this->db();

        $on = $db->table('daily_online_stock')->where('entryDate', $date)->where('shift', $shift)
            ->selectRaw('COUNT(*) AS entries,
                COALESCE(SUM(openingStock),0) AS opening,
                COALESCE(SUM(stockInOffToOl),0) AS transferIn,
                COALESCE(SUM(stockOutOlToOff),0) AS transferOut,
                COALESCE(SUM(productionIn),0) AS productionIn,
                COALESCE(SUM(fulfillmentOut),0) AS fulfillmentOut,
                COALESCE(SUM(rts),0) AS rts,
                COALESCE(SUM(remainingStock),0) AS remaining')->first();

        $off = $db->table('daily_offline_stock')->where('entryDate', $date)->where('shift', $shift)
            ->selectRaw('COUNT(*) AS entries,
                COALESCE(SUM(openingStock),0) AS opening,
                COALESCE(SUM(stockInOlToOff),0) AS transferIn,
                COALESCE(SUM(stockOutOffToOl),0) AS transferOut,
                COALESCE(SUM(productionIn),0) AS productionIn,
                COALESCE(SUM(deliveryOut),0) AS deliveryOut,
                COALESCE(SUM(backloads),0) AS backloads,
                COALESCE(SUM(upsellOut),0) AS upsellOut,
                COALESCE(SUM(remainingStock),0) AS remaining')->first();

        $n = fn ($v) => round((float) $v, 2);

        return [
            'entries' => (int) $on->entries + (int) $off->entries,
            'online' => [
                'entries' => (int) $on->entries,
                'opening' => $n($on->opening),
                'transferIn' => $n($on->transferIn),
                'transferOut' => $n($on->transferOut),
                'productionIn' => $n($on->productionIn),
                'fulfillmentOut' => $n($on->fulfillmentOut),
                'rts' => $n($on->rts),
                'remaining' => $n($on->remaining),
            ],
            'offline' => [
                'entries' => (int) $off->entries,
                'opening' => $n($off->opening),
                'transferIn' => $n($off->transferIn),
                'transferOut' => $n($off->transferOut),
                'productionIn' => $n($off->productionIn),
                'deliveryOut' => $n($off->deliveryOut),
                'backloads' => $n($off->backloads),
                'upsellOut' => (int) $off->upsellOut,
                'remaining' => $n($off->remaining),
            ],
        ];
    }

    private function trend(string $latestDate): array
    {
        $db = $this->db();
        $from = CarbonImmutable::parse($latestDate)->subDays(self::TREND_DAYS - 1)->toDateString();
        $key = fn ($r) => substr((string) $r->entryDate, 0, 10);

        $on = $db->table('daily_online_stock')->whereBetween('entryDate', [$from, $latestDate])
            ->groupBy('entryDate')
            ->selectRaw('entryDate, SUM(productionIn) AS p, SUM(fulfillmentOut) AS f')
            ->get()->keyBy($key);

        $off = $db->table('daily_offline_stock')->whereBetween('entryDate', [$from, $latestDate])
            ->groupBy('entryDate')
            ->selectRaw('entryDate, SUM(productionIn) AS p, SUM(deliveryOut) AS d')
            ->get()->keyBy($key);

        $rows = [];
        for ($i = 0; $i < self::TREND_DAYS; $i++) {
            $d = CarbonImmutable::parse($from)->addDays($i)->toDateString();
            $rows[] = [
                'date' => $d,
                'production' => round((float) ($on[$d]->p ?? 0) + (float) ($off[$d]->p ?? 0), 2),
                'fulfillment' => round((float) ($on[$d]->f ?? 0), 2),
                'delivery' => round((float) ($off[$d]->d ?? 0), 2),
            ];
        }

        return $rows;
    }

    // ------------------------------------------------------------ product stock

    /** Each active product's latest Online and Offline remaining stock. */
    private function productStock(string $latestDate): array
    {
        $cutoff = CarbonImmutable::parse($latestDate)->subDays(self::LOOKBACK_DAYS)->toDateString();

        $latest = fn (string $table) => "SELECT productId, remainingStock,
                ROW_NUMBER() OVER (PARTITION BY productId ORDER BY entryDate DESC, (`shift` = 'NIGHT') DESC) AS rn
            FROM {$table} WHERE entryDate >= ?";

        $sql = "WITH o AS ({$latest('daily_online_stock')}), f AS ({$latest('daily_offline_stock')})
            SELECT p.id, p.sku, p.name, p.category, p.unit, p.lowStockThreshold AS threshold,
                COALESCE(o.remainingStock, 0) AS online, COALESCE(f.remainingStock, 0) AS offline
            FROM products p
            LEFT JOIN o ON o.productId = p.id AND o.rn = 1
            LEFT JOIN f ON f.productId = p.id AND f.rn = 1
            WHERE p.isActive = 1
            ORDER BY p.sortOrder, p.name";

        return array_map(function ($r) {
            $online = round((float) $r->online, 2);
            $offline = round((float) $r->offline, 2);

            return [
                'id' => (int) $r->id,
                'sku' => $r->sku,
                'name' => $r->name,
                'category' => $r->category ?: 'Uncategorised',
                'unit' => $r->unit,
                'online' => $online,
                'offline' => $offline,
                'total' => round($online + $offline, 2),
                'threshold' => $r->threshold === null ? null : round((float) $r->threshold, 2),
            ];
        }, $this->db()->select($sql, [$cutoff, $cutoff]));
    }

    private function summariseStock(array $products): array
    {
        $c = collect($products);

        $low = $c->filter(fn ($p) => $p['threshold'] !== null && $p['total'] <= $p['threshold'])
            ->map(fn ($p) => $p + ['status' => $p['total'] <= 0 ? 'out' : 'low'])
            ->sortBy([
                fn ($a, $b) => ($a['status'] === 'out' ? 0 : 1) <=> ($b['status'] === 'out' ? 0 : 1),
                fn ($a, $b) => ($a['total'] / max($a['threshold'], 0.01)) <=> ($b['total'] / max($b['threshold'], 0.01)),
            ])->values();

        $categories = $c->groupBy('category')->map(fn ($g, $name) => [
            'category' => $name,
            'products' => $g->count(),
            'online' => round($g->sum('online'), 2),
            'offline' => round($g->sum('offline'), 2),
            'total' => round($g->sum('total'), 2),
        ])->sortByDesc('total')->values();

        return [
            'total' => round($c->sum('total'), 2),
            'online' => round($c->sum('online'), 2),
            'offline' => round($c->sum('offline'), 2),
            'inStock' => $c->where('total', '>', 0)->count(),
            'thresholds' => $c->whereNotNull('threshold')->count(),
            'lowCount' => $low->count(),
            'outCount' => $low->where('status', 'out')->count(),
            'low' => $low->take(12)->all(),
            'top' => $c->sortByDesc('total')->take(8)->values()->all(),
            'categories' => $categories->all(),
        ];
    }

    // ------------------------------------------------------------ audit, log

    private function audit(): ?array
    {
        $db = $this->db();

        $latest = $db->table('manual_counts')->select('entryDate', 'shift')
            ->orderByDesc('entryDate')->orderByRaw("(`shift` = 'NIGHT') DESC")->first();

        if (! $latest) {
            return null;
        }
        $date = substr((string) $latest->entryDate, 0, 10);

        $s = $db->table('manual_counts')->where('entryDate', $date)->where('shift', $latest->shift)
            ->selectRaw('COUNT(*) AS total,
                COALESCE(SUM(isOpeningBalance = 0 AND variance <> 0), 0) AS withVariance,
                COALESCE(SUM(CASE WHEN isOpeningBalance = 0 THEN variance END), 0) AS net,
                COALESCE(SUM(CASE WHEN isOpeningBalance = 0 THEN ABS(variance) END), 0) AS absTotal,
                COALESCE(SUM(publishedAt IS NULL), 0) AS unpublished')->first();

        $top = $db->table('manual_counts as m')->join('products as p', 'p.id', '=', 'm.productId')
            ->where('m.entryDate', $date)->where('m.shift', $latest->shift)
            ->where('m.isOpeningBalance', 0)->where('m.variance', '<>', 0)
            ->orderByRaw('ABS(m.variance) DESC')->limit(6)
            ->get(['p.name', 'p.sku', 'p.unit', 'm.location', 'm.systemRemainingStock as system',
                'm.manualCount as counted', 'm.variance', 'm.remarks'])
            ->map(fn ($r) => [
                'name' => $r->name, 'sku' => $r->sku, 'unit' => $r->unit, 'location' => $r->location,
                'system' => round((float) $r->system, 2), 'counted' => round((float) $r->counted, 2),
                'variance' => round((float) $r->variance, 2), 'remarks' => $r->remarks,
            ])->all();

        return [
            'date' => $date,
            'shift' => $latest->shift,
            'totalCounts' => (int) $s->total,
            'withVariance' => (int) $s->withVariance,
            'netVariance' => round((float) $s->net, 2),
            'absVariance' => round((float) $s->absTotal, 2),
            'unpublished' => (int) $s->unpublished,
            'top' => $top,
        ];
    }

    private function closures(): array
    {
        return $this->db()->table('day_closures as c')
            ->leftJoin('users as u', 'u.id', '=', 'c.closedById')
            ->orderByDesc('c.entryDate')->orderByRaw("(c.`shift` = 'NIGHT') DESC")->limit(8)
            ->get(['c.entryDate', 'c.shift', 'c.isClosed', 'c.entriesOnly', 'c.closedAt', 'c.unlockReason', 'u.name as closedBy'])
            ->map(fn ($c) => [
                'date' => substr((string) $c->entryDate, 0, 10),
                'shift' => $c->shift,
                'status' => $this->closureStatus($c),
                'closedAt' => $this->iso($c->closedAt),
                'closedBy' => $c->closedBy,
                'unlockReason' => $c->unlockReason,
            ])->all();
    }

    private function activity(): array
    {
        return $this->db()->table('change_log as l')
            ->leftJoin('users as u', 'u.id', '=', 'l.changedById')
            ->orderByDesc('l.id')->limit(8)
            ->get(['l.id', 'l.tableName', 'l.recordId', 'l.action', 'l.changedAt', 'u.name as user'])
            ->map(fn ($l) => [
                'id' => (int) $l->id,
                'table' => $l->tableName,
                'recordId' => (int) $l->recordId,
                'action' => $l->action,
                'at' => $this->iso($l->changedAt),
                'user' => $l->user,
            ])->all();
    }

    private function iso(mixed $value): ?string
    {
        return $value ? CarbonImmutable::parse((string) $value, 'UTC')->toIso8601ZuluString() : null;
    }
}
