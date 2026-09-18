import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";

export type ThemeMode = "light" | "dark" | "system";
export type Language = "vi" | "en";

export type AppSettings = {
  theme: ThemeMode;
  fontScale: number; // 0.9 | 1 | 1.15 | 1.3
  language: Language;
  notifications: boolean;
};

export const FONT_SCALES = [
  { value: 0.9, label: "Nhỏ" },
  { value: 1, label: "Vừa" },
  { value: 1.15, label: "Lớn" },
  { value: 1.3, label: "Rất lớn" },
];

const DEFAULTS: AppSettings = {
  theme: "system",
  fontScale: 1,
  language: "vi",
  notifications: true,
};

const LS_KEY = "dhamma-stream-settings";

function loadLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* bỏ qua */
  }
  return DEFAULTS;
}

function saveLocal(s: AppSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* bỏ qua */
  }
}

type SettingsContextValue = {
  settings: AppSettings;
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemeMode) => void;
  setFontScale: (v: number) => void;
  setLanguage: (l: Language) => void;
  setNotifications: (v: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const serverSettings = useQuery(
    api.library.getSettings,
    isAuthenticated ? {} : "skip",
  );
  const updateServer = useMutation(api.library.updateSettings);

  const [settings, setSettings] = useState<AppSettings>(loadLocal);

  // Khi server có dữ liệu (lần đầu đăng nhập), ưu tiên server
  const [syncedOnce, setSyncedOnce] = useState(false);
  useEffect(() => {
    if (serverSettings && !syncedOnce) {
      setSyncedOnce(true);
      setSettings((prev) => ({
        theme: (serverSettings.theme as ThemeMode) ?? prev.theme,
        fontScale: serverSettings.fontScale ?? prev.fontScale,
        language: (serverSettings.language as Language) ?? prev.language,
        notifications: serverSettings.notifications ?? prev.notifications,
      }));
    }
  }, [serverSettings, syncedOnce]);

  // Áp dụng chủ đề + cỡ chữ lên <html>
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark =
      settings.theme === "dark" ||
      (settings.theme === "system" && prefersDark);
    root.classList.toggle("dark", dark);
    root.style.setProperty("--font-size-scale", String(settings.fontScale));
    root.lang = settings.language;
    saveLocal(settings);
  }, [settings]);

  const persist = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveLocal(next);
        return next;
      });
      if (isAuthenticated) {
        void updateServer(patch).catch(() => {
          /* im lặng — sẽ tự sync lần sau */
        });
      }
    },
    [isAuthenticated, updateServer],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme:
        settings.theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : settings.theme,
      setTheme: (t) => persist({ theme: t }),
      setFontScale: (v) => persist({ fontScale: v }),
      setLanguage: (l) => persist({ language: l }),
      setNotifications: (v) => persist({ notifications: v }),
    }),
    [settings, persist],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings phải dùng trong SettingsProvider");
  return ctx;
}
