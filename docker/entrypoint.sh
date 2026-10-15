#!/bin/sh
set -e
cd /var/www/html

php artisan package:discover --ansi || true

# Laravel's own database (the "dashboard-db" container). Nothing to migrate yet.
php artisan migrate --force --no-interaction || echo "Skipping migrate: dashboard-db not ready."

echo "Stocks dashboard is up on http://localhost:8080"
exec php -S 0.0.0.0:8000 -t public docker/router.php
