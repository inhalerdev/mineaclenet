"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./BlockMenu.module.css";

/*
 * Blocky dropdown for filters (Bans page and the like). Each option is a
 * plain link, so filters stay in the URL and work without JavaScript: with
 * JS off the menu is a <details> that still opens on click.
 *
 *   <BlockMenu label="Type" options={[{ label: "Bans", href: "?type=ban", current: true }, ...]} />
 *
 * Closes on outside click, Escape, or picking an option.
 */
export type BlockMenuOption = {
  label: string;
  href: string;
  current?: boolean;
  /* Small colored square before the label (e.g. ban red). */
  swatch?: string;
};

export function BlockMenu({ label, options }: { label: string; options: BlockMenuOption[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const current = options.find((option) => option.current) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      className={styles.menu}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.trigger} aria-controls={listId}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {current?.swatch ? <i style={{ background: current.swatch }} aria-hidden="true" /> : null}
          {current?.label}
        </span>
        <span className={styles.arrow} aria-hidden="true" />
      </summary>

      <ul className={styles.list} id={listId}>
        {options.map((option) => (
          <li key={option.href}>
            <a
              className={styles.option}
              href={option.href}
              aria-current={option.current ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              {option.swatch ? (
                <i style={{ background: option.swatch }} aria-hidden="true" />
              ) : null}
              {option.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
