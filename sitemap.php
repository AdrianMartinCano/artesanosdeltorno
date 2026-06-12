<?php
header('Content-Type: application/xml; charset=utf-8');

$api  = 'https://admin.artesanosdeltorno.es/api';
$base = 'https://artesanosdeltorno.es';
$hoy  = date('Y-m-d');

$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
$raw = @file_get_contents($api . '/artesano', false, $ctx);
$artesanos = $raw ? (json_decode($raw, true) ?: []) : [];

// [ruta, changefreq, priority]
$static = [
    ['/',               'weekly',  '1.0'],
    ['/eventos.html',   'weekly',  '0.9'],
    ['/galeria.html',   'monthly', '0.7'],
    ['/historia.html',  'yearly',  '0.6'],
    ['/junta.html',     'yearly',  '0.6'],
    ['/estatutos.html', 'yearly',  '0.5'],
];

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

foreach ($static as [$path, $freq, $prio]) {
    echo "  <url>\n";
    echo "    <loc>{$base}{$path}</loc>\n";
    echo "    <lastmod>{$hoy}</lastmod>\n";
    echo "    <changefreq>{$freq}</changefreq>\n";
    echo "    <priority>{$prio}</priority>\n";
    echo "  </url>\n";
}

foreach ($artesanos as $a) {
    $slug = htmlspecialchars($a['slug'] ?? '', ENT_XML1);
    if (!$slug) continue;
    $lastmod = isset($a['fechaModificacion'])
        ? substr($a['fechaModificacion'], 0, 10)
        : $hoy;
    echo "  <url>\n";
    echo "    <loc>{$base}/artesano.html?slug={$slug}</loc>\n";
    echo "    <lastmod>{$lastmod}</lastmod>\n";
    echo "    <changefreq>monthly</changefreq>\n";
    echo "    <priority>0.8</priority>\n";
    echo "  </url>\n";
}

echo '</urlset>';
