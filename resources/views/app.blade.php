<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Stocks overview | Ala Eh Food Products</title>
    <meta name="color-scheme" content="light dark">
    <link rel="icon" type="image/png" href="/logo.png">
    <script>
        // Apply the saved theme (dark black/yellow by default) before first paint to avoid a flash.
        try {
            var t = localStorage.getItem('theme');
            if (t !== 'light') {
                document.documentElement.classList.add('dark');
            }
        } catch (e) {}
    </script>
    @viteReactRefresh
    @vite('resources/js/app.tsx')
</head>
<body>
    <div id="root"></div>
    <noscript>This dashboard needs JavaScript.</noscript>
</body>
</html>
