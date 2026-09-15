"use client";

import { useCallback, useEffect, useState } from "react";

const NAVIGATION_DRAWER_KEY = "mineacle:navigation-collapsed";

export function useNavigationDrawer() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem(NAVIGATION_DRAWER_KEY) ===
        "true",
    );
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        NAVIGATION_DRAWER_KEY,
        String(next),
      );
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
