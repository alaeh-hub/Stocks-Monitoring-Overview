<?php

namespace App\Http\Controllers;

use App\Services\StockDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class DashboardController extends Controller
{
    public function __invoke(Request $request, StockDashboardService $service): JsonResponse
    {
        try {
            $data = $request->boolean('refresh')
                ? $service->build()
                : Cache::remember('stocks.dashboard', 15, fn () => $service->build());

            return response()->json($data);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Could not read the Stocks Monitoring database.',
                'detail' => $this->explain($e),
            ], 503);
        }
    }

    /** Turn a driver error into something the person running this can act on. */
    private function explain(Throwable $e): string
    {
        $conn = config('database.connections.stocks');
        $raw = $e->getMessage();

        $code = $e instanceof \Illuminate\Database\QueryException
            ? (int) ($e->errorInfo[1] ?? 0)
            : 0;
        if ($code === 0 && preg_match('/\[(\d{4})\]/', $raw, $m)) {
            $code = (int) $m[1];
        }

        return match (true) {
            in_array($code, [2002, 2003, 2006], true) => sprintf(
                'The database server at %s:%s is not reachable. Check STOCKS_DB_HOST and STOCKS_DB_PORT in .env and that the Stocks Monitoring MySQL is running.',
                $conn['host'], $conn['port']),
            $code === 1045 => 'MySQL rejected the username or password. Check STOCKS_DB_USERNAME and STOCKS_DB_PASSWORD in .env.',
            $code === 1049 => sprintf('The database "%s" does not exist. Check STOCKS_DB_DATABASE in .env.', $conn['database']),
            $code === 1146 => 'A Stocks Monitoring table is missing. Make sure Prisma migrations have been applied to this database.',
            $code === 1064 => 'This dashboard needs MySQL 8.0 or newer (it uses window functions).',
            default => config('app.debug') ? $raw : 'Check storage/logs or run "docker compose logs app" for details.',
        };
    }
}
