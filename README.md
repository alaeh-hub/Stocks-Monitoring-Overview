# Stocks Dashboard (Laravel + React + MySQL)

A one-page dashboard that reads the **Stocks Monitoring** database (the Prisma/MySQL one)
and shows what needs attention right now: restock alerts, the latest shift's movement,
a 14-day flow chart, count audit variances, period closures and recent changes.

```
Browser (React + TypeScript)  ->  Laravel  /api/dashboard  ->  Stocks Monitoring MySQL (read only)
                                         \->  dashboard-db (Laravel's own MySQL)
```

It never writes to the stocks database and never runs migrations against it.
Prisma still owns that schema.

## Run it

You need Docker. The first build takes a few minutes.

**1. Point it at your stocks database.** Open `.env` and set the `STOCKS_DB_*` values:

```
STOCKS_DB_HOST=host.docker.internal
STOCKS_DB_PORT=3306
STOCKS_DB_DATABASE=stocks          # the database name in your DATABASE_URL
STOCKS_DB_USERNAME=stocks_readonly
STOCKS_DB_PASSWORD=change-me
```

Those values come from the `DATABASE_URL` your Stocks Monitoring server uses:
`mysql://USER:PASSWORD@HOST:PORT/DATABASE`.

**2. (Recommended) create a read-only MySQL user** so the dashboard can only `SELECT`:

```sql
CREATE USER 'stocks_readonly'@'%' IDENTIFIED BY 'a-strong-password';
GRANT SELECT ON stocks.* TO 'stocks_readonly'@'%';
FLUSH PRIVILEGES;
```

Run it with `docker exec -it <your-stocks-mysql-container> mysql -uroot -p`.
For a quick first try you can also put your existing credentials in `.env`.

**3. Make the container able to reach that MySQL.** Pick one:

- **A. Your stocks MySQL publishes a port on this PC** (for example `3306:3306`).
  Keep `STOCKS_DB_HOST=host.docker.internal` and set `STOCKS_DB_PORT` to the published port.
- **B. It is not published.** Join the dashboard to the network your stocks stack already uses:
  1. Run `docker network ls` and note the network name (usually `<folder>_default`).
  2. In `.env` set `STOCKS_NETWORK=<that name>`, `STOCKS_DB_HOST=<MySQL service name from your stocks docker-compose.yml>` and `STOCKS_DB_PORT=3306`.
  3. Start with the extra file: `docker compose -f docker-compose.yml -f docker-compose.shared-network.yml up --build`

**4. Start it** (for option A):

```bash
docker compose up --build
```

Open **http://localhost:8080**.

If something is wrong with the connection, the page tells you what to fix
(wrong host, bad password, unknown database, missing tables).

## What the dashboard reads

| Panel | Tables |
|---|---|
| Headline, split bar, restock watch, holdings, categories | `products`, `daily_online_stock`, `daily_offline_stock` (each product's latest `remainingStock`, Online + Offline) |
| Produced, shipped out, returned | latest shift in `daily_online_stock` and `daily_offline_stock`, compared with the shift before |
| Stock flow chart | last 14 days of the same two tables |
| Latest count audit | `manual_counts` (variance = system minus counted) |
| Recent periods | `day_closures` |
| Recent changes | `change_log`, `users` |
| Needs review | unpublished `manual_counts`, pending `correction_requests` |

Notes:
- "Latest" means the highest date, then NIGHT after MORNING, matching how your shifts are ordered.
- A product is on the restock watch when its Online + Offline remaining stock is at or below `lowStockThreshold`. Products with no threshold are never flagged.
- Each product's latest stock is looked up over the last 90 days (`LOOKBACK_DAYS` in `app/Services/StockDashboardService.php`).
- Totals add up each product in its own unit (pcs, packs), so read them as a volume gauge.
- Results are cached for 15 seconds on the server. The Refresh button bypasses the cache. The page also refreshes itself every minute.
- Needs **MySQL 8.0+** on the stocks side (the queries use window functions).

## Project layout

```
app/Services/StockDashboardService.php   all queries against the stocks DB
app/Http/Controllers/DashboardController.php   GET /api/dashboard + friendly errors
config/database.php                      "mysql" (Laravel's own) and "stocks" (read only)
resources/js/                            React + TypeScript UI (Vite, Tailwind, Recharts)
docker-compose.yml, Dockerfile           app + dashboard-db
```

## Run without Docker (development)

Needs PHP 8.2+ with `pdo_mysql`, Composer, Node 20+.

```bash
composer install
npm install
# in .env: STOCKS_DB_HOST=127.0.0.1, DB_HOST=127.0.0.1 (or any MySQL), CACHE_STORE=file
php artisan serve        # terminal 1
npm run dev              # terminal 2
```

## Troubleshooting

- **"not reachable"**: wrong `STOCKS_DB_HOST` or `STOCKS_DB_PORT`, or the stocks MySQL is not running or not published. See step 3.
- **"rejected the username or password"**: check `STOCKS_DB_USERNAME` and `STOCKS_DB_PASSWORD`. After editing `.env`, run `docker compose up -d --force-recreate app`.
- **"table is missing"**: Prisma migrations have not been applied to that database.
- **Logs**: `docker compose logs app`
