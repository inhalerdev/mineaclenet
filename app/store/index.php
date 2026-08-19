<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/bootstrap.php';

$storeUrl = (string) config('store_url', 'https://store.mineacle.net');

header('Location: ' . $storeUrl, true, 302);
exit;
