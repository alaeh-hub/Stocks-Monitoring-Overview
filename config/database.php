<?php

return [
    // Laravel's own database (users, snapshots, future features).
    'default' => env('DB_CONNECTION', 'mysql'),

    'connections' => [

        'mysql' => [
            'driver' => 'mysql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'dashboard'),
            'username' => env('DB_USERNAME', 'dashboard'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ],

        // The Stocks Monitoring database (owned by Prisma). Read only: this app
        // never runs migrations or writes to it.
        'stocks' => [
            'driver' => 'mysql',
            'host' => env('STOCKS_DB_HOST', 'host.docker.internal'),
            'port' => env('STOCKS_DB_PORT', '3306'),
            'database' => env('STOCKS_DB_DATABASE', 'stocks'),
            'username' => env('STOCKS_DB_USERNAME', 'root'),
            'password' => env('STOCKS_DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => false,
            'timezone' => '+00:00', // Prisma stores DateTime values in UTC
            'engine' => null,
            'options' => [
                PDO::ATTR_TIMEOUT => 5,
            ],
        ],

    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],
];
