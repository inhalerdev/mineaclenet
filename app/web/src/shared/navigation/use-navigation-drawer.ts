"use client";

import { useCallback, useEffect, useState } from "react";

const NAVIGATION_DRAWER_KEY = "mineacle:navigation-collapsed";

function syncDocumentState(collapsed: boolean) {
  document.documentElement.dataset.navigationCollapsed = String(collapsed);
}

export function useNavigationDrawer() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedState =
      window.localStorage.getItem(NAVIGATION_DRAWER_KEY) ===
      "true";

    syncDocumentState(storedState);
    setCollapsed(storedState);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        NAVIGATION_DRAWER_KEY,
        String(next),
      );
      syncDocumentState(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
