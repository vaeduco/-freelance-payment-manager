"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import type { Density, FontSize, SidebarDefault, UserSettings } from "@/lib/types";

interface AppSettings {
  fontSize: FontSize;
  density: Density;
  sidebarDefault: SidebarDefault;
}

interface AppSettingsContext extends AppSettings {
  /** Update one or more UI prefs and apply them app-wide immediately (preview). */
  setLocal: (patch: Partial<AppSettings>) => void;
}

const Ctx = createContext<AppSettingsContext | null>(null);

/** Apply the visual prefs to <html> via data attributes (styled in globals.css). */
function applyToDom({ fontSize, density }: Pick<AppSettings, "fontSize" | "density">) {
  const el = document.documentElement;
  el.dataset.fontSize = fontSize;
  el.dataset.density = density;
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial: UserSettings;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    fontSize: initial.font_size,
    density: initial.density,
    sidebarDefault: initial.sidebar_default,
  });

  // Supabase is the source of truth on load: sync the DB theme into next-themes
  // (which then owns the .dark class + localStorage) exactly once on mount.
  const themeSynced = useRef(false);
  useEffect(() => {
    if (!themeSynced.current) {
      themeSynced.current = true;
      setTheme(initial.theme);
    }
  }, [initial.theme, setTheme]);

  // Apply font size + density to <html> whenever they change.
  useEffect(() => {
    applyToDom(settings);
  }, [settings]);

  const setLocal = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return <Ctx.Provider value={{ ...settings, setLocal }}>{children}</Ctx.Provider>;
}

export function useAppSettings(): AppSettingsContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAppSettings must be used within <SettingsProvider>");
  }
  return ctx;
}
