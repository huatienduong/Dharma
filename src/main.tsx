import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";
import { UpdateChecker } from "@/components/UpdateChecker";
import { PlayerProvider } from "@/lib/player";
import { SettingsProvider } from "@/lib/settings";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Suttas = lazy(() => import("./pages/Suttas.tsx"));
const Vinaya = lazy(() => import("./pages/Vinaya.tsx"));
const Dictionary = lazy(() => import("./pages/Dictionary.tsx"));
const CalendarPage = lazy(() => import("./pages/Calendar.tsx"));
const Meditation = lazy(() => import("./pages/Meditation.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Assistant = lazy(() => import("./pages/Assistant.tsx"));
const WatchTogether = lazy(() => import("./pages/WatchTogether.tsx"));
const Watched = lazy(() => import("./pages/Watched.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Đang tải…</div>
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
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
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

// Lazy load các named export (trang đọc chi tiết)
const SuttaReader = lazy(() =>
  import("./pages/Suttas.tsx").then((m) => ({ default: m.SuttaReader })),
);
const VinayaReader = lazy(() =>
  import("./pages/Vinaya.tsx").then((m) => ({ default: m.VinayaReader })),
);
const MeditationDetail = lazy(() =>
  import("./pages/Meditation.tsx").then((m) => ({
    default: m.MeditationDetail,
  })),
);



function RouteSyncer() {
  const location = useLocation();
  console.log("[Dharma Router]", location.pathname, "basename=/dharma");
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
          <BrowserRouter basename="/dharma">
            <PlayerProvider>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                {/* Khách chưa đăng nhập vẫn xem được toàn bộ nội dung;
                    tiến trình chỉ được lưu khi đã đăng nhập. */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/suttas" element={<Suttas />} />
                <Route path="/suttas/:id" element={<SuttaReader />} />
                <Route path="/vinaya" element={<Vinaya />} />
                <Route path="/vinaya/:id" element={<VinayaReader />} />
                <Route path="/dictionary" element={<Dictionary />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/meditation" element={<Meditation />} />
                <Route path="/meditation/:id" element={<MeditationDetail />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/watch" element={<WatchTogether />} />
                <Route path="/watched" element={<Watched />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PlayerProvider>
          </BrowserRouter>
        </SettingsProvider>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

// Gỡ màn boot tĩnh trong index.html — React đã render xong
(window as unknown as { __dsBootDone?: () => void }).__dsBootDone?.();
