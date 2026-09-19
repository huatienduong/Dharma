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
  { value: 0.9, labelKey: "fontSmall" },
  { value: 1, labelKey: "fontMedium" },
  { value: 1.15, labelKey: "fontLarge" },
  { value: 1.3, labelKey: "fontXl" },
] as const;

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
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      // Ứng dụng mặc định chỉ dùng Tiếng Việt — ghi đè mọi lựa chọn cũ
      const merged = { ...DEFAULTS, ...parsed };
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
/* i18n — bản dịch tiếng Việt / tiếng Anh                              */
/* ------------------------------------------------------------------ */

const VI = {
  // App / nav
  appName: "Dharma",
  appTagline: "Theravāda — Nguyên thủy",
  navTalks: "Pháp thoại",
  navSuttas: "Kinh tạng",
  navVinaya: "Luật tạng",
  navDictionary: "Từ điển",
  navCalendar: "Lịch Phật giáo",
  navMeditation: "Thiền",
  navAssistant: "Trợ lý Phật học",
  navSettings: "Cài đặt",
  navProfile: "Hồ sơ",
  logout: "Đăng xuất",
  openMenu: "Mở menu",
  closeMenu: "Đóng menu",
  // Dashboard
  talksTitle: "Pháp thoại Theravāda",
  talksSubtitle: "Đề xuất thuyết giảng từ các vị giảng sư Phật giáo Nguyên thủy",
  searchPlaceholder: "Tìm pháp thoại, giảng sư…",
  continueWatching: "Tiếp tục xem",
  noProgress:
    "Chưa có tiến trình xem. Hãy mở một pháp thoại — ứng dụng sẽ tự ghi nhớ vị trí bạn dừng lại.",
  related: "Liên quan",
  nowPlaying: "Đang phát",
  watched: "Đã xem",
  views: "lượt xem",
  results: "Kết quả tìm kiếm",
  noResults: "Không tìm thấy pháp thoại nào phù hợp.",
  articles: "bài",
  sync: "Đồng bộ",
  room: "Phòng",
  roomDesc: "Xem pháp thoại cùng bạn bè — đồng bộ một nhịp, mic & cam",
  openRoom: "Mở Phòng",
  joinRoom: "Vào phòng",
  enterRoomCode: "Nhập mã phòng 6 ký tự:",
  todayPick: "Đề xuất hôm nay",
  // Settings
  settingsTitle: "Cài đặt",
  settingsSubtitle: "Tùy chỉnh ứng dụng theo ý bạn",
  sectionAppearance: "Giao diện",
  sectionReading: "Nội dung & đọc",
  sectionPrivacy: "Quyền riêng tư",
  sectionAbout: "Về ứng dụng",
  theme: "Chế độ hiển thị",
  themeLight: "Sáng",
  themeDark: "Tối",
  themeSystem: "Theo hệ thống",
  fontSize: "Cỡ chữ",
  fontSmall: "Nhỏ",
  fontMedium: "Vừa",
  fontLarge: "Lớn",
  fontXl: "Rất lớn",
  language: "Ngôn ngữ",
  notifications: "Thông báo ứng dụng",
  notifDesc: "Nhận thông báo pháp thoại mới và lịch lễ",
  screenshotBlock: "Chống chụp màn hình",
  screenshotBlockDesc:
    "Che nội dung ứng dụng khi chụp ảnh/quay màn hình hoặc ghi hình ở chế độ nền",
  checkUpdate: "Kiểm tra cập nhật",
  developer: "Nhà phát triển",
  version: "Phiên bản",
  // Misc
  loading: "Đang tải…",
  guestNotice:
    "Bạn đang xem với tư cách khách — tiến trình được lưu trên thiết bị này. Đăng nhập để đồng bộ mọi nơi.",
  loginRegister: "Đăng nhập / Đăng ký",
  // Trang con
  suttasSubtitle: "Sutta Piṭaka — học Kinh, luận giải và chú giải theo truyền thống Theravāda",
  dictTitle: "Từ điển Phật học",
  dictSubtitle: "Thuật ngữ Pāḷi chuyên ngành theo truyền thống Theravāda",
  watchedSubtitle: "Lịch sử xem của bạn — dừng ở đâu, quay lại đúng đoạn đó",
  suttaSearchPlaceholder: "Tìm kinh theo tên, số hiệu, nội dung…",
  dictSearchPlaceholder: "Tìm thuật ngữ — ví dụ: anicca, niết bàn, uposatha…",
  clearSearch: "Xóa tìm kiếm",
  modeLabel: "Chế độ sáng / tối",
  lightDesc: "Nền nâu sáng",
  darkDesc: "Dễ mắt khi đêm",
  systemDesc: "Theo thiết bị",
  appSection: "Ứng dụng",
  latestVersion: "Phiên bản mới nhất",
};

const EN: Partial<Record<keyof typeof VI, string>> = {
  // App / nav
  appName: "Dharma",
  appTagline: "Theravāda — Early Buddhism",
  navTalks: "Dhamma Talks",
  navSuttas: "Suttas",
  navVinaya: "Vinaya",
  navDictionary: "Dictionary",
  navCalendar: "Buddhist Calendar",
  navMeditation: "Meditation",
  navAssistant: "Dharma Assistant",
  navSettings: "Settings",
  navProfile: "Profile",
  logout: "Sign out",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  // Dashboard
  talksTitle: "Theravāda Dhamma Talks",
  talksSubtitle:
    "Featured teachings from Early Buddhism (Theravāda) teachers",
  searchPlaceholder: "Search talks, teachers…",
  continueWatching: "Continue watching",
  noProgress:
    "Nothing here yet. Open a talk — the app remembers where you stopped.",
  related: "Related",
  nowPlaying: "Playing",
  watched: "Watched",
  views: "views",
  results: "Search results",
  noResults: "No matching talks found.",
  articles: "talks",
  sync: "Sync",
  room: "Room",
  roomDesc: "Watch Dhamma together — synced playback, mic & camera",
  openRoom: "Open Room",
  joinRoom: "Join room",
  enterRoomCode: "Enter the 6-character room code:",
  todayPick: "Pick of the day",
  // Settings
  settingsTitle: "Settings",
  settingsSubtitle: "Make the app yours",
  sectionAppearance: "Appearance",
  sectionReading: "Content & reading",
  sectionPrivacy: "Privacy",
  sectionAbout: "About",
  theme: "Appearance mode",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  fontSize: "Font size",
  fontSmall: "Small",
  fontMedium: "Medium",
  fontLarge: "Large",
  fontXl: "Extra large",
  language: "Language",
  notifications: "Notifications",
  notifDesc: "New talks and holy-day reminders",
  screenshotBlock: "Screenshot protection",
  screenshotBlockDesc:
    "Hide app content when taking screenshots/screen recording or when app goes to background",
  checkUpdate: "Check for updates",
  developer: "Developer",
  version: "Version",
  // Misc
  loading: "Loading…",
  guestNotice:
    "You are browsing as a guest — progress is saved on this device. Sign in to sync everywhere.",
  loginRegister: "Sign in / Sign up",
  // Pages
  suttasSubtitle:
    "Sutta Piṭaka — study, commentary and exposition in the Theravāda tradition",
  dictTitle: "Buddhist Dictionary",
  dictSubtitle: "Pāli terminology of the Theravāda tradition",
  watchedSubtitle:
    "Your watch history — resume exactly where you stopped",
  suttaSearchPlaceholder: "Search suttas by name, number or content…",
  dictSearchPlaceholder: "Search terms — e.g. anicca, nibbāna, uposatha…",
  clearSearch: "Clear search",
  modeLabel: "Light / dark mode",
  lightDesc: "Warm light theme",
  darkDesc: "Easy on night eyes",
  systemDesc: "Follow device",
  appSection: "App",
  latestVersion: "Latest version",
};

export type TranslateKey = keyof typeof VI;

type SettingsContextValue = {
  settings: AppSettings;
  resolvedTheme: "light" | "dark";
  t: (key: TranslateKey) => string;
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
    root.lang = settings.language === "en" ? "en" : "vi";
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
      resolvedTheme:
        settings.theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : settings.theme,
      t,
      setTheme: (mode) => persist({ theme: mode }),
      setFontScale: (v) => persist({ fontScale: v }),
      setLanguage: (l) => persist({ language: l }),
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
    setFontScale: () => {},
    setLanguage: () => {},
    setNotifications: () => {},
  };
}
