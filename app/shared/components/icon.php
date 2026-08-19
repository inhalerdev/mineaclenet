<?php

declare(strict_types=1);

function render_icon(string $file, string $class = ''): void
{
    $classes = trim('ui-icon ' . $class);
    echo '<span class="' . e($classes) . '" aria-hidden="true" style="--icon-url:url(\'/shared/assets/icons/' . e($file) . '\')"></span>';
}
