"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, isThemeId, ThemeId } from "@/lib/themes";

const LEGACY_STORAGE_KEY = "bitacora-theme";
const getStorageKey = (userId: string) => `bitacora-theme:${userId}`;

export function useTheme(userId?: string | null, accountTheme?: ThemeId) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    if (!userId) {
      setThemeState(DEFAULT_THEME);
      document.documentElement.dataset.theme = DEFAULT_THEME;
      return;
    }

    const storageKey = getStorageKey(userId);
    let nextTheme = accountTheme && isThemeId(accountTheme) ? accountTheme : DEFAULT_THEME;
    try {
      const savedTheme = window.localStorage.getItem(storageKey);
      const legacyTheme = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!accountTheme && savedTheme && isThemeId(savedTheme)) nextTheme = savedTheme;
      else if (!accountTheme && legacyTheme && isThemeId(legacyTheme)) {
        nextTheme = legacyTheme;
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      // El tema de la cuenta sigue disponible aunque el navegador bloquee localStorage.
    }
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, [accountTheme, userId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
    if (userId) {
      try {
        window.localStorage.setItem(getStorageKey(userId), nextTheme);
      } catch {
        // La interfaz cambia igualmente; MongoDB conservará la preferencia de la cuenta.
      }
    }
    document.documentElement.dataset.theme = nextTheme;
  }, [userId]);

  return { theme, setTheme };
}
