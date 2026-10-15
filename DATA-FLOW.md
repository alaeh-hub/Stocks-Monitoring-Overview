# How the Dashboard Gets Its Data from the Monitoring System

This describes the full path from a stock entry typed into the Monitoring System to a number on the Dashboard, and how the two projects are connected.

## 1. Overview

```
Encoder                Monitoring System (Docker)                      Dashboard (Docker)
-------                --------------------------                      ------------------
Types a shift  --->  web (nginx :8080) --> api (Node/Prisma) --> MySQL  <---(read only)---  Laravel API  <---  React page
                                                      db: ala_eh_stocks     user: dashboard_ro   /api/dashboard     :8081
```

- The **Monitoring System** owns the data. Its Prisma schema (`server/prisma/schema.prisma`) defines every table.
- The **Dashboard** never writes to that database and never runs migrations on it. It only runs `SELECT` queries through a dedicated read-only MySQL user.
- The Dashboard has its **own** separate MySQL (`dashboard-db`) for Laravel's internal needs. It holds no stock data.

## 2. Where the data is created (Monitoring System)

Encoders save entries per product, per date and per shift (`MORNING` / `NIGHT`):

| Table | What it holds |
| --- | --- |
| `products` | Master list: SKU, name, category, unit, `isActive`, `lowStockThreshold` |
| `daily_online_stock` | Online movement per product/date/shift, including `remainingStock` |
| `daily_offline_stock` | Offline movement per product/date/shift, including `remainingStock` |
| `manual_counts` | Physical counts and their variance against the system figure |
| `day_closures` | Which date/shift periods are finished or closed |
| `change_log` | Audit trail of every change |
| `correction_requests` | Pending/approved corrections |

`remainingStock` is calculated by the Monitoring System and becomes the next shift's opening stock. The Dashboard reads it as stored and does not recalculate it.

## 3. How the Dashboard connects

### 3.1 Docker network

The Monitoring System's database is not published on a host port. It is only reachable inside Docker on the network `monitoringsystem_internal`, under the service name `db`. The Dashboard joins that network using the extra compose file:

```powershell
docker compose -f docker-compose.yml -f docker-compose.shared-network.yml up -d --build
```

`docker-compose.shared-network.yml` attaches the `app` container to the network named by `STOCKS_NETWORK`. If the app is started without this file it cannot resolve `db` and the API returns a 503.

### 3.2 Environment settings (`.env`)

```
STOCKS_NETWORK=monitoringsystem_internal
STOCKS_DB_HOST=db
STOCKS_DB_PORT=3306
STOCKS_DB_DATABASE=ala_eh_stocks
STOCKS_DB_USERNAME=dashboard_ro
STOCKS_DB_PASSWORD=<password you set for dashboard_ro>
```

`config/database.php` exposes these as a second Laravel connection named `stocks`, separate from the default connection to `dashboard-db`. It uses a 5 second timeout and UTC, because Prisma stores dates in UTC.

### 3.3 The read-only MySQL user

Created once, inside the Monitoring System's MySQL container:

```sql
CREATE USER 'dashboard_ro'@'%' IDENTIFIED BY '<password>';
GRANT SELECT ON ala_eh_stocks.* TO 'dashboard_ro'@'%';
FLUSH PRIVILEGES;
```

Open the prompt with:

```powershell
docker exec -it monitoringsystem-db-1 sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
```

The user can only `SELECT`, so the Dashboard cannot change stock data. To remove it: `DROP USER 'dashboard_ro'@'%';`.

## 4. Request flow

1. The browser loads `http://localhost:8081`. `routes/web.php` serves one Blade view, and the React app (`resources/js`) takes over.
2. The React hook `useDashboard` calls `GET /api/dashboard`, and again about every minute.
3. `DashboardController` (`app/Http/Controllers/DashboardController.php`) caches the result for **15 seconds** (`Cache::remember`). Adding `?refresh=1` skips the cache.
4. On a cache miss it calls `StockDashboardService::build()` (`app/Services/StockDashboardService.php`), which runs the queries below on the `stocks` connection.
5. The controller returns one JSON payload, and React renders it.
6. If a query fails, the controller returns HTTP 503 with a plain-language `detail` (unreachable host, bad password, missing database, missing table, MySQL older than 8.0).

## 5. What `StockDashboardService` reads

| Dashboard part | Source | Logic |
| --- | --- | --- |
| Latest period | `daily_online_stock`, `daily_offline_stock` | Highest `entryDate`; `NIGHT` if it has entries, otherwise `MORNING` |
| Period status | `day_closures` | `open`, `unlocked`, `entries_locked` (encoder finished the day) or `closed` |
| Shift movement | both daily tables | Sums of opening, transfers, production, fulfilment/delivery, RTS, backloads for the latest period and the one before it |
| Remaining stock | both daily tables + `products` | Each active product's latest `remainingStock`, looking back up to 90 days. Missing = 0. Total = online + offline |
| Low / out of stock | `products.lowStockThreshold` | Flagged when total is at or below the threshold. Products with no threshold are never flagged |
| 14-day trend | both daily tables | Production, fulfilment and delivery per date |
| Count audit | `manual_counts`, `products` | Latest counted period: counts that differ, net/absolute variance, top 6 variances. Opening balances are excluded |
| Unpublished counts, pending corrections | `manual_counts`, `correction_requests` | Plain counts |
| Recent periods | `day_closures`, `users` | Last 8 |
| Recent changes | `change_log`, `users` | Last 8 |

Everything is keyed off the two daily stock tables. If both are empty the API returns `empty: true` and the page shows "No stock entries yet".

## 6. Setup checklist

1. Start the Monitoring System (`docker compose up -d` in its folder). Confirm `monitoringsystem-db-1` is healthy.
2. Create the `dashboard_ro` user (section 3.3).
3. Set the `STOCKS_*` values in the Dashboard `.env` (section 3.2). Use the same password as in step 2, with no quotes or spaces.
4. Start the Dashboard with **both** compose files (section 3.1).
5. Open `http://localhost:8081`.

Ports: Monitoring System `8080`, Dashboard `8081`, Dashboard's own MySQL `3307`.

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| App container restarts in a loop with `set: Illegal option -` | `docker/entrypoint.sh` had Windows (CRLF) line endings | Keep it LF. `.gitattributes` enforces `*.sh text eol=lf` |
| "rejected the username or password" | Password in `.env` differs from the MySQL user's | `ALTER USER 'dashboard_ro'@'%' IDENTIFIED BY '<pw>';` and set the same in `.env`, then recreate the app |
| "database server at db:3306 is not reachable" / 503 | App not on the Monitoring network | Start with both compose files; check `docker inspect stocks-dashboard-app-1` lists `monitoringsystem_internal` |
| "database ... does not exist" | Wrong `STOCKS_DB_DATABASE` | Use `ala_eh_stocks` |
| "table is missing" | Prisma migrations not applied | Run the Monitoring System's migrations |
| "No stock entries yet" | Daily stock tables are empty | Encode and save a shift in the Monitoring System at port 8080 |
| Entries saved but Dashboard still empty | Entries saved into a different database (for example the XAMPP one used by the dev setup on port 5173) | Encode in the Docker app, which uses `monitoringsystem-db-1` |
| Page crashes with `Cannot read properties of null (reading 'shift')` | Fixed: the payload's `period` was overwritten with `null` by an array union | Fixed in `StockDashboardService::build()` by using `array_merge` |

After changing `.env`, recreate the container so it re-reads the file (`up -d --force-recreate app`); a plain restart does not.

## 8. Limits to know about

- The Dashboard shows `remainingStock` from the daily tables, not manual counts. Manual counts only feed the audit panel.
- Totals add up each product in its own unit.
- The data is at most about 15 seconds old at the API, plus the page's refresh interval.
- The Dashboard depends on the Monitoring System's table and column names. If the Prisma schema changes (renamed columns, dropped tables), `StockDashboardService.php` must be updated to match.
