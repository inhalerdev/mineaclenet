"use client";

import { type CSSProperties, useState } from "react";
import { sizedImage } from "@/features/marketplace/images";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./Enchanted.module.css";

/*
 * The Marketplace's "enchanted" look, borrowed from Minecraft itself:
 *
 *   EnchantedArt    a package image with the enchantment glint sweeping
 *                   across its own shape (a CSS mask of the same image)
 *   EnchantedScene  the backdrop: dark, with a soft purple glow at the item
 *   RuneCircle      a faint rune ring the item floats over
 *   Glyphs          enchanting-table glyphs drifting in from the sides into
 *                   the item, like bookshelves feeding an enchanting table
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

/* A dark backdrop with a soft purple glow where the item sits. */
export function EnchantedScene({ variant }: { variant: "hero" | "panel" }) {
  return <span className={styles.scene} data-variant={variant} aria-hidden="true" />;
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

/*
 * Like the bookshelves round an enchanting table: glyphs drift in from both
 * sides and fade into the item. Each starts at an offset (px) from the item
 * and flies to it; --spread scales the offsets to the space available.
 */
type Glyph = { fromX: number; fromY: number; delay: number; time: number };

const GLYPHS: Glyph[] = [
  { fromX: -150, fromY: -30, delay: 0, time: 3.4 },
  { fromX: 155, fromY: -55, delay: 0.4, time: 3.8 },
  { fromX: -135, fromY: 45, delay: 0.9, time: 3.1 },
  { fromX: 145, fromY: 35, delay: 1.3, time: 3.6 },
  { fromX: -95, fromY: -85, delay: 1.8, time: 2.9 },
  { fromX: 105, fromY: -90, delay: 2.2, time: 3.3 },
  { fromX: -165, fromY: 5, delay: 2.7, time: 3.9 },
  { fromX: 170, fromY: 15, delay: 3.1, time: 3.2 },
  { fromX: -120, fromY: -60, delay: 3.6, time: 3.5 },
  { fromX: 125, fromY: 65, delay: 4.0, time: 3.0 },
];

export function Glyphs({ className }: { className?: string }) {
  return (
    <span className={`${styles.glyphs} ${className ?? ""}`.trim()} aria-hidden="true">
      {GLYPHS.map((glyph, index) => (
        <svg
          key={index}
          className={styles.glyph}
          viewBox="0 0 5 5"
          shapeRendering="crispEdges"
          style={{
            "--from-x": `${glyph.fromX}px`,
            "--from-y": `${glyph.fromY}px`,
            "--delay": `${glyph.delay}s`,
            "--time": `${glyph.time}s`,
          } as CSSProperties}
        >
          <path d={GLYPH_ART[index % GLYPH_ART.length]} />
        </svg>
      ))}
    </span>
  );
}
