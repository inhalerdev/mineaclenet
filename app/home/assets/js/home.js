(() => {
    const stage = document.querySelector('[data-skin-stage]');
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    stage.addEventListener('pointermove', (event) => {
        if (window.innerWidth < 981) return;

        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        stage.querySelector('img')?.style.setProperty('transform', `translate3d(${x * 7}px, ${y * 5}px, 0)`);
    });

    stage.addEventListener('pointerleave', () => {
        stage.querySelector('img')?.style.removeProperty('transform');
    });
})();
