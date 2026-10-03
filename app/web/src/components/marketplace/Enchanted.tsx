"use client";

import { type CSSProperties, useState } from "react";
import { sizedImage } from "@/features/marketplace/images";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { PixelStar } from "./bits";
import styles from "./Enchanted.module.css";

/*
 * The Marketplace's "enchanted" look, borrowed from Minecraft itself:
 *
 *   EnchantedArt    a package image with the enchantment glint sweeping
 *                   across its own shape (a CSS mask of the same image)
 *   EnchantedScene  the backdrop: purple glow, slow light rays, pixel stars
 *                   and sparkles
 *   RuneCircle      a glowing rune ring the item floats over
 *   Glyphs          enchanting-table glyphs drifting up around the item
 *
 * All decoration is aria-hidden and stops for prefers-reduced-motion.
 */

/* --- Images ----------------------------------------------------------------- */

/*
 * A Tebex image, resized by /_next/image for where it's shown
 * (features/marketplace/images.ts). If that copy fails it falls back to the
 * original; without an image it shows the pixel chest.
 */
export function useMarketImage(src: string | null, width: number) {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return { url: mineacleIcons.crate, pixel: true, onError: undefined };
  }

  return {
    url: failed ? src : sizedImage(src, width),
    pixel: false,
    onError: failed ? undefined : () => setFailed(true),
  };
}

export function MarketImage({
  src,
  width,
  eager = false,
  className,
}: {
  src: string | null;
  width: number;
  eager?: boolean;
  className?: string;
}) {
  const image = useMarketImage(src, width);

  return (
    <img
      className={`${styles.thumb} ${className ?? ""}`.trim()}
      src={image.url}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      data-pixel={image.pixel || undefined}
      onError={image.onError}
    />
  );
}

/*
 * The image filling its box (object-fit: contain) with the glint on top.
 * glint: "always", "hover" (runs while an ancestor with
 * data-glint-trigger is hovered or focused) or "none".
 */
export function EnchantedArt({
  src,
  width,
  glint = "always",
  float = false,
  eager = false,
  className,
}: {
  src: string | null;
  width: number;
  glint?: "always" | "hover" | "none";
  float?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const image = useMarketImage(src, width);

  return (
    <span
      className={`${styles.art} ${className ?? ""}`.trim()}
      data-float={float || undefined}
      aria-hidden="true"
    >
      <img
        className={styles.image}
        src={image.url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        data-pixel={image.pixel || undefined}
        onError={image.onError}
      />
      {glint !== "none" && !image.pixel ? (
        <span
          className={styles.glint}
          data-mode={glint}
          style={{ "--art": cssUrl(image.url) } as CSSProperties}
        />
      ) : null}
    </span>
  );
}

/* An image address as a CSS url() for the glint's mask, quotes escaped. */
function cssUrl(url: string) {
  return `url("${url.replace(/["\\\n\r]/g, (character) => encodeURIComponent(character))}")`;
}

/* --- Backdrop ----------------------------------------------------------------- */

type Sparkle = { x: number; y: number; size: number; delay: number; gold?: boolean };

const SPARKLES: Record<"hero" | "panel", Sparkle[]> = {
  hero: [
    { x: 55, y: 16, size: 10, delay: 0 },
    { x: 66, y: 76, size: 8, delay: 1.1, gold: true },
    { x: 92, y: 22, size: 12, delay: 2.2 },
    { x: 88, y: 70, size: 8, delay: 0.6 },
    { x: 61, y: 42, size: 6, delay: 2.9, gold: true },
    { x: 79, y: 10, size: 8, delay: 1.7 },
    { x: 96, y: 52, size: 6, delay: 3.4, gold: true },
    { x: 8, y: 14, size: 7, delay: 2.5 },
    { x: 42, y: 88, size: 6, delay: 1.4 },
  ],
  panel: [
    { x: 16, y: 18, size: 9, delay: 0 },
    { x: 82, y: 26, size: 7, delay: 1.3, gold: true },
    { x: 74, y: 78, size: 8, delay: 2.4 },
    { x: 22, y: 72, size: 6, delay: 0.8, gold: true },
  ],
};

export function EnchantedScene({ variant }: { variant: "hero" | "panel" }) {
  return (
    <span className={styles.scene} data-variant={variant} aria-hidden="true">
      <span className={styles.rays} />
      {SPARKLES[variant].map((sparkle, index) => (
        <PixelStar
          key={index}
          className={`${styles.sparkle} ${sparkle.gold ? styles.sparkleGold : ""}`.trim()}
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            "--size": `${sparkle.size}px`,
            "--delay": `${sparkle.delay}s`,
          } as CSSProperties}
        />
      ))}
    </span>
  );
}

/* --- Rune circle ---------------------------------------------------------------- */

export function RuneCircle({ className }: { className?: string }) {
  return <span className={`${styles.circle} ${className ?? ""}`.trim()} aria-hidden="true" />;
}

/* --- Enchanting glyphs -------------------------------------------------------------- */

/*
 * A few letters of the enchanting table's alphabet (Minecraft's Standard
 * Galactic Alphabet), drawn as 5×5 pixel art.
 */
const GLYPH_ART = [
  ["....#", "....#", "#####", "....#", "....#"],
  ["#####", ".#.#.", ".#.#.", ".#.#.", "....."],
  ["#####", "....#", "....#", "....#", "....."],
  ["#####", "#...#", "#...#", "#...#", "....."],
  ["#..#.", "#..#.", "#..#.", "...#.", "..#.."],
  ["#####", ".....", "#.#.#", ".....", "....."],
  ["..#..", "..#..", "#####", ".....", "#####"],
  ["..#..", ".....", "#...#", ".....", "....."],
].map((rows) =>
  rows
    .flatMap((row, y) => [...row].map((cell, x) => (cell === "#" ? `M${x} ${y}h1v1h-1z` : "")))
    .join(""),
);

type Glyph = { x: number; y: number; delay: number; time: number; drift: number };

const GLYPHS: Glyph[] = [
  { x: 14, y: 80, delay: 0, time: 5.4, drift: -16 },
  { x: 28, y: 88, delay: 1.6, time: 6.2, drift: 12 },
  { x: 42, y: 82, delay: 3.1, time: 5.8, drift: -10 },
  { x: 57, y: 90, delay: 0.8, time: 6.6, drift: 14 },
  { x: 71, y: 84, delay: 2.4, time: 5.2, drift: -12 },
  { x: 85, y: 78, delay: 4.0, time: 6.0, drift: 10 },
  { x: 22, y: 70, delay: 4.6, time: 5.6, drift: 8 },
  { x: 78, y: 68, delay: 5.3, time: 5.0, drift: -8 },
];

export function Glyphs({ count = GLYPHS.length }: { count?: number }) {
  return (
    <span className={styles.glyphs} aria-hidden="true">
      {GLYPHS.slice(0, count).map((glyph, index) => (
        <svg
          key={index}
          className={styles.glyph}
          viewBox="0 0 5 5"
          shapeRendering="crispEdges"
          style={{
            left: `${glyph.x}%`,
            top: `${glyph.y}%`,
            "--delay": `${glyph.delay}s`,
            "--time": `${glyph.time}s`,
            "--drift": `${glyph.drift}px`,
          } as CSSProperties}
        >
          <path d={GLYPH_ART[index % GLYPH_ART.length]} />
        </svg>
      ))}
    </span>
  );
}
