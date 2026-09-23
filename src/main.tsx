import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";
import { ServiceNotice } from "@/components/ServiceNotice";
import { UpdateChecker } from "@/components/UpdateChecker";
import { PlayerProvider } from "@/lib/player";
import {
  AudioPlayerProvider,
} from "@/lib/audioPlayer";
import { AudioBar } from "@/components/AudioBar";
import { SettingsProvider } from "@/lib/settings";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Suttas = lazy(() => import("./pages/Suttas.tsx"));
const Vinaya = lazy(() => import("./pages/Vinaya.tsx"));
const Abhidhamma = lazy(() => import("./pages/Abhidhamma.tsx"));
const Dictionary = lazy(() => import("./pages/Dictionary.tsx"));
const CalendarPage = lazy(() => import("./pages/Calendar.tsx"));
const Meditation = lazy(() => import("./pages/Meditation.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));
const Assistant = lazy(() => import("./pages/Assistant.tsx"));
const Watched = lazy(() => import("./pages/Watched.tsx"));
const Lookup = lazy(() => import("./pages/Lookup.tsx"));
const News = lazy(() => import("./pages/News.tsx"));
const BuddhistHistory = lazy(() => import("./pages/BuddhistHistory.tsx"));
const Listen = lazy(() => import("./pages/Listen.tsx"));

// Fallback chuyển route — LOGO chính thức, KHÔNG chữ loading
function RouteLoading() {
  const logo = typeof localStorage !== "undefined" ? localStorage.getItem("dharma-logo-url") : null;
  return (
    <div className="flex min-h-screen items-center justify-center">
      {logo ? (
        <img src={logo} alt="" className="h-16 w-16 animate-pulse rounded-3xl object-contain" />
      ) : (
        <span aria-hidden className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-primary/10 text-3xl text-primary">☸</span>
      )}
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold tracking-tight">
              Dharma đang được nâng cấp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Đội ngũ kỹ thuật của chúng tôi đang tiến hành nâng cấp hệ thống hoặc
              nếu bạn thấy thông báo này có thể ứng dụng Dharma đang gặp sự cố lỗi
              tạm thời. Hãy thử tải lại trang này nếu tình trạng không được giải
              quyết hãy sử dụng tính năng báo cáo lỗi trong phần cài đặt của ứng
              dụng. Rất xin lỗi vì sự bất tiện gây ra cho bạn!
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
              >
                Tải lại trang
              </button>
              <a
                href={`${ROUTER_BASENAME === "/" ? "" : ROUTER_BASENAME}/settings`}
                className="w-full rounded-full border border-border/70 px-5 py-2.5 text-sm font-medium transition hover:bg-accent sm:w-auto"
              >
                Báo cáo lỗi
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Deployment HOẠT ĐỘNG ĐÃ XÁC MINH (HTTP + WebSocket trả dữ liệu thật).
// Cố định — không phụ thuộc env của nền tảng vì các URL env cũ đều đã chết
// (proficient-lapwing bị pause, next-porpoise đã bị xóa).
const DHARMA_CONVEX_URL = "https://steady-rhinoceros-488.convex.cloud";
const convex = new ConvexReactClient(DHARMA_CONVEX_URL);

// SỬA LỖI TRẮNG TRANG trên domain riêng: basename phải tự động theo nơi app
// được phục vụ — nền tảng chạy dưới /dharma, còn dharma.freebuff.app phục vụ
// ở gốc /. Baseline sai → không route nào khớp → trang render rỗng.
const ROUTER_BASENAME = window.location.pathname.startsWith("/dharma")
  ? "/dharma"
  : "/";

// Lazy load các named export (trang đọc chi tiết)
const SuttaReader = lazy(() =>
  import("./pages/Suttas.tsx").then((m) => ({ default: m.SuttaReader })),
);
const VinayaReader = lazy(() =>
  import("./pages/Vinaya.tsx").then((m) => ({ default: m.VinayaReader })),
);
const AbhidhammaReader = lazy(() =>
  import("./pages/Abhidhamma.tsx").then((m) => ({
    default: m.AbhidhammaReader,
  })),
);
const MeditationDetail = lazy(() =>
  import("./pages/Meditation.tsx").then((m) => ({
    default: m.MeditationDetail,
  })),
);



function RouteSyncer() {
  const location = useLocation();
  console.log("[Dharma Router]", location.pathname, "basename=" + ROUTER_BASENAME);
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <SettingsProvider>
          <ScreenshotGuard />
          <UpdateChecker />
          <BrowserRouter basename={ROUTER_BASENAME}>
            <AudioPlayerProvider>
            <PlayerProvider>
            <RouteSyncer />
            {/* Thông báo mất kết nối / nâng cấp hệ thống / sự cố tạm thời */}
            <ServiceNotice />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                {/* Không còn đăng nhập/đăng ký — toàn bộ dữ liệu lưu cục bộ */}
                {/* Trang chủ: tin tức Phật giáo + video nổi bật */}
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/suttas" element={<Suttas />} />
                <Route path="/suttas/:id" element={<SuttaReader />} />
                <Route path="/vinaya" element={<Vinaya />} />
                <Route path="/vinaya/:id" element={<VinayaReader />} />
                <Route path="/abhidhamma" element={<Abhidhamma />} />
                <Route path="/abhidhamma/:id" element={<AbhidhammaReader />} />
                <Route path="/dictionary" element={<Dictionary />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/meditation" element={<Meditation />} />
                <Route path="/meditation/:id" element={<MeditationDetail />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/watched" element={<Watched />} />
                <Route path="/lookup" element={<Lookup />} />
                <Route path="/news" element={<News />} />
                <Route path="/history" element={<BuddhistHistory />} />
                <Route path="/listen" element={<Listen />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AudioBar />
            </PlayerProvider>
            </AudioPlayerProvider>
          </BrowserRouter>
        </SettingsProvider>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

// Gỡ màn boot tĩnh trong index.html — React đã render xong
(window as unknown as { __dsBootDone?: () => void }).__dsBootDone?.();
