<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

render_page_start('Vote', 'vote');
?>
<section class="section-page">
    <p class="section-kicker">Support Mineacle</p>
    <h1 class="section-title">Vote once. Earn more in game.</h1>
    <p class="section-copy">The full voting integration can plug into this page later. The structure is already isolated in its own route and ready for API-backed vote status.</p>

    <div class="content-grid">
        <?php foreach ([1, 2, 3] as $site): ?>
            <article class="panel-card">
                <h2>Vote site <?= $site ?></h2>
                <p>Mock vote endpoint ready to be replaced with the network's real voting provider.</p>
            </article>
        <?php endforeach; ?>
    </div>
</section>
<?php render_page_end(); ?>
