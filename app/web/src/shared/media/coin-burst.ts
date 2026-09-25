import { playNotes } from "@/shared/media/chiptune";

/**
 * Pops a handful of spinning pixel gold coins out of an element
 * (used by the Marketplace button). Styles live in app/effects.css.
 * Skipped entirely for people who prefer reduced motion.
 */
const COIN_COUNT = 10;

export function burstCoins(origin: HTMLElement) {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const box = origin.getBoundingClientRect();
  const originX = box.left + box.width / 2;
  const originY = box.top + box.height / 2;

  // Classic coin "bling": B5 then E6.
  playNotes([987.77, 1318.51], { step: 0.07, length: 0.22, volume: 0.04 });

  for (let index = 0; index < COIN_COUNT; index += 1) {
    const coin = document.createElement("span");
    coin.className = "mc-coin";
    coin.setAttribute("aria-hidden", "true");
    coin.style.left = `${originX}px`;
    coin.style.top = `${originY}px`;
    coin.appendChild(document.createElement("i"));
    document.body.appendChild(coin);

    // Small hop up, then a spread-out fall past the button (it sits at the
    // top of the page, so a big upward spray would leave the screen).
    const dx = (Math.random() * 2 - 1) * (40 + Math.random() * 90);
    const rise = -(18 + Math.random() * 34);
    const fall = 120 + Math.random() * 110;

    const animation = coin.animate(
      [
        {
          transform: "translate(-50%, -50%) translate(0, 0) scale(0.5)",
          opacity: 1,
        },
        {
          transform: `translate(-50%, -50%) translate(${dx * 0.6}px, ${rise}px) scale(1)`,
          opacity: 1,
          offset: 0.42,
        },
        {
          transform: `translate(-50%, -50%) translate(${dx}px, ${rise + fall}px) scale(0.85)`,
          opacity: 0,
        },
      ],
      {
        duration: 760 + Math.random() * 360,
        delay: index * 22,
        easing: "cubic-bezier(0.25, 0.6, 0.4, 1)",
        fill: "both",
      },
    );

    animation.onfinish = () => coin.remove();
    animation.oncancel = () => coin.remove();
  }
}
