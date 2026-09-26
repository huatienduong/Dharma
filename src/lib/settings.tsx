import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";
export type Language = "vi" | "en";

/** Cỡ chữ cố định — KHÔNG cho điều chỉnh trong ứng dụng (thiết kế tối ưu sẵn). */
export const FIXED_FONT_SCALE = 1;

export type AppSettings = {
  theme: ThemeMode;
  language: Language;
  notifications: boolean;
};

const DEFAULTS: AppSettings = {
  theme: "light",
  language: "vi",
  notifications: true,
};

const LS_KEY = "dhamma-stream-settings";

/**
 * Sự kiện bảo cho các nơi NGOÀI provider biết cờ thông báo vừa đổi (khung
 * thông báo, banner cập nhật) — hai nơi đó không nằm trong SettingsProvider.
 */
export const NOTIFICATIONS_PREF_EVENT = "dhamma:notifications-pref";

/**
 * Đọc cờ thông báo ngoài React. Nguồn duy nhất vẫn là localStorage nên không
 * lệch với `useSettings()`.
 */
export function readNotificationsPref(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS.notifications;
    const parsed = JSON.parse(raw) as { notifications?: unknown };
    return parsed.notifications !== false;
  } catch {
    return DEFAULTS.notifications;
  }
}

function loadLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings> & {
        fontScale?: unknown;
      };
      // Ứng dụng mặc định chỉ dùng Tiếng Việt — ghi đè mọi lựa chọn cũ.
      // Dọn dữ liệu cũ: cỡ chữ không còn cho điều chỉnh → bỏ khóa.
      const { fontScale: _legacy, ...rest } = parsed;
      const merged = { ...DEFAULTS, ...rest };
      merged.language = "vi";
      return merged as AppSettings;
    }
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

/* ------------------------------------------------------------------ */
/* i18n — ứng dụng dùng Tiếng Việt; chỉ giữ các khóa đang được dùng    */
/* ------------------------------------------------------------------ */

const VI = {
  appName: "Trợ lý Phật học",
  appTagline: "Trợ lý Phật học Theravāda",
  settingsTitle: "Cài đặt",
  settingsSubtitle: "Tùy chỉnh ứng dụng theo ý bạn",
  sectionAppearance: "Giao diện",
  themeLight: "Sáng",
  themeDark: "Tối",
  notifications: "Thông báo ứng dụng",
};

const EN: Partial<Record<keyof typeof VI, string>> = {
  appName: "Trợ lý Phật học",
  appTagline: "Theravāda Buddhist Assistant",
  settingsTitle: "Settings",
  settingsSubtitle: "Make the app yours",
  sectionAppearance: "Appearance",
  themeLight: "Light",
  themeDark: "Dark",
  notifications: "Notifications",
};

export type TranslateKey = keyof typeof VI;

type SettingsContextValue = {
  settings: AppSettings;
  resolvedTheme: "light" | "dark";
  t: (key: TranslateKey) => string;
  setTheme: (t: ThemeMode) => void;
  setNotifications: (v: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadLocal);

  // Ứng dụng chỉ dùng MỘT giao diện màu nâu nên KHÔNG gắn class `dark`
  // nữa — tuỳ chọn Sáng/Tối đã được bỏ khỏi Cài đặt.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.removeProperty("--font-size-scale");
    root.lang = settings.language === "en" ? "en" : "vi";
    saveLocal(settings);
    // Báo sau khi ĐÃ ghi xong xuống localStorage, để nơi nhận sự kiện đọc
    // được giá trị mới chứ không phải giá trị cũ.
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_PREF_EVENT, {
        detail: { notifications: settings.notifications },
      }),
    );
  }, [settings]);

  const persist = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveLocal(next);
        return next;
      });
    },
    [],
  );

  // Hàm dịch — chọn bảng theo ngôn ngữ hiện tại
  const t = useCallback(
    (key: TranslateKey) =>
      settings.language === "en"
        ? (EN[key] ?? VI[key])
        : VI[key],
    [settings.language],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme: settings.theme,
      t,
      setTheme: (mode) => persist({ theme: mode }),
      setNotifications: (v) => persist({ notifications: v }),
    }),
    [settings, persist, t],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx) return ctx;
  // Fallback an toàn (tránh crash khi dùng ngoài provider)
  return {
    settings: DEFAULTS,
    resolvedTheme: "light" as const,
    t: (key: TranslateKey) => VI[key],
    setTheme: () => {},
    setNotifications: () => {},
  };
}
