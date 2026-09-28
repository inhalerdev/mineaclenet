"use client";

import { useEffect, useState } from "react";
import styles from "./ToastRoot.module.css";

/*
 * One shared spot at the bottom of the screen for pop-ups (friend online,
 * IP copied). Pop-ups are drawn into it with createPortal, so they stack
 * neatly instead of landing on top of each other, and no page box or frame
 * edge can sit over them. Returns null until the page has loaded in the
 * browser.
 */
const ROOT_ID = "mineacle-toasts";

export function useToastRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(ROOT_ID);

    if (!element) {
      element = document.createElement("div");
      element.id = ROOT_ID;
      element.className = styles.root;
      document.body.appendChild(element);
    }

    setRoot(element);
  }, []);

  return root;
}
