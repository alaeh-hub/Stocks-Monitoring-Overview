<?php

// Router for PHP's built-in web server: serve real files (built JS, CSS, fonts)
// directly and send everything else to Laravel.
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if ($uri !== '/' && is_file(__DIR__.'/../public'.$uri)) {
    return false;
}

require __DIR__.'/../public/index.php';
