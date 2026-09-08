"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, isThemeId, ThemeId } from "@/lib/themes";

const STORAGE_KEY = "bitacora-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme && isThemeId(savedTheme)) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  return { theme, setTheme };
}
