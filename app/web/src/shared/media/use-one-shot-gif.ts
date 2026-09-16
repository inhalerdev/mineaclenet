"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function removeGifLoopExtension(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  const signatures = ["NETSCAPE2.0", "ANIMEXTS1.0"];

  for (let index = 3; index <= bytes.length - 11; index += 1) {
    if (
      bytes[index - 3] !== 0x21 ||
      bytes[index - 2] !== 0xff ||
      bytes[index - 1] !== 0x0b
    ) {
      continue;
    }

    const signature = String.fromCharCode(
      ...bytes.slice(index, index + 11),
    );

    if (!signatures.includes(signature)) {
      continue;
    }

    const extensionStart = index - 3;
    let extensionEnd = index + 11;

    while (extensionEnd < bytes.length) {
      const blockSize = bytes[extensionEnd];
      extensionEnd += 1;

      if (blockSize === 0) {
        break;
      }

      extensionEnd += blockSize;
    }

    const singlePlayGif = new Uint8Array(
      bytes.length - (extensionEnd - extensionStart),
    );
    singlePlayGif.set(bytes.slice(0, extensionStart));
    singlePlayGif.set(
      bytes.slice(extensionEnd),
      extensionStart,
    );
    return singlePlayGif.buffer;
  }

  return data;
}

export function useOneShotGif(
  source: string,
  sourceIsOneShot = false,
) {
  const [animationSrc, setAnimationSrc] =
    useState<string | null>(null);
  const [run, setRun] = useState<string | null>(null);
  const gifRef = useRef<Blob | null>(null);
  const hoveredRef = useRef(false);
  const runCountRef = useRef(0);

  useEffect(() => {
    if (sourceIsOneShot) {
      gifRef.current = null;
      setAnimationSrc(null);
      return;
    }

    const controller = new AbortController();
    gifRef.current = null;

    async function prepareAnimation() {
      try {
        const response = await fetch(source, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const gifData = removeGifLoopExtension(
          await response.arrayBuffer(),
        );
        const gif = new Blob([gifData], { type: "image/gif" });

        gifRef.current = gif;
        setAnimationSrc(URL.createObjectURL(gif));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to prepare one-shot GIF", error);
        }
      }
    }

    void prepareAnimation();

    return () => controller.abort();
  }, [source, sourceIsOneShot]);

  useEffect(() => {
    if (!animationSrc?.startsWith("blob:")) {
      return;
    }

    return () => URL.revokeObjectURL(animationSrc);
  }, [animationSrc]);

  const start = useCallback(() => {
    if (hoveredRef.current) {
      return;
    }

    hoveredRef.current = true;

    if (sourceIsOneShot) {
      runCountRef.current += 1;
      setRun(`${Date.now()}-${runCountRef.current}`);
      return;
    }

    if (gifRef.current) {
      setAnimationSrc(URL.createObjectURL(gifRef.current));
    }
  }, [sourceIsOneShot]);

  const stop = useCallback(() => {
    hoveredRef.current = false;
  }, []);

  return {
    src: sourceIsOneShot
      ? run
        ? `${source}?run=${run}`
        : source
      : animationSrc ?? source,
    start,
    stop,
  };
}
