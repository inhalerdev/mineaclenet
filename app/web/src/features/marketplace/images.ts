/*
 * Package and category images from Tebex are uploads of any size (renders of
 * 1–2 MB are common). Pages ask Next's image endpoint (/_next/image) for a
 * copy sized to where it's shown, served from mineacle.net as WebP. Hosts
 * here must match images.remotePatterns in next.config.mjs. Anything else is
 * used as is.
 *
 * Optimised copies come from this site, so CSS masks can use them (the
 * enchantment glint follows the image's shape, see Enchanted.tsx).
 */
const TEBEX_IMAGE_HOSTS = [/^dunb17ur4ymx4\.cloudfront\.net$/, /(^|\.)tebex\.io$/];

/* Widths Next serves by default (images.deviceSizes and imageSizes). */
const WIDTHS = [128, 256, 384, 640, 828, 1080];

function optimisable(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && TEBEX_IMAGE_HOSTS.some((host) => host.test(parsed.hostname));
  } catch {
    return false;
  }
}

/* The image at about `width` CSS pixels wide (doubled for sharp screens). */
export function sizedImage(url: string, width: number) {
  if (!optimisable(url)) {
    return url;
  }

  const wanted = WIDTHS.find((size) => size >= width * 2) ?? WIDTHS[WIDTHS.length - 1];
  return `/_next/image?url=${encodeURIComponent(url)}&w=${wanted}&q=75`;
}
