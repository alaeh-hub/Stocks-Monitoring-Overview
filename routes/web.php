<?php

use Illuminate\Support\Facades\Route;

// One page. React takes over from here and calls /api/dashboard.
Route::view('/', 'app');
