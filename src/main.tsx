import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";
import { ServiceNotice } from "@/components/ServiceNotice";
import { UpdateChecker } from "@/components/UpdateChecker";
import { SettingsProvider } from "@/lib/settings";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Dharma AI — ứng dụng chỉ còn Trợ lý Phật học (màn chính) + Cài đặt.
// Lazy load route components for better code splitting
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));
const Assistant = lazy(() => import("./pages/Assistant.tsx"));

// Fallback chuyển route — nền phẳng sạch, không logo
function RouteLoading() {
  return <div className="min-h-screen bg-background" />;
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
              Dharma AI đang được nâng cấp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Đội ngũ kỹ thuật của chúng tôi đang tiến hành nâng cấp hệ thống hoặc
              nếu bạn thấy thông báo này có thể ứng dụng Dharma AI đang gặp sự cố lỗi
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

// Deployment HOẠT ĐỘNG ĐÃ XÁC MINH (HTTP 200 + query trả dữ liệu thật).
// Cố định — không phụ thuộc env của nền tảng vì các URL env cũ đều đã chết.
const DHARMA_CONVEX_URL = "https://fearless-anteater-216.convex.cloud";
const convex = new ConvexReactClient(DHARMA_CONVEX_URL);

// SỬA LỖI TRẮNG TRANG trên domain riêng: basename phải tự động theo nơi app
// được phục vụ — nền tảng chạy dưới /dharma, còn dharma.freebuff.app phục vụ
// ở gốc /. Baseline sai → không route nào khớp → trang render rỗng.
const ROUTER_BASENAME = window.location.pathname.startsWith("/dharma")
  ? "/dharma"
  : "/";





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
            <RouteSyncer />
            {/* Thông báo mất kết nối / nâng cấp hệ thống / sự cố tạm thời */}
            <ServiceNotice />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                {/* Dharma AI: màn chính là Trợ lý Phật học */}
                <Route path="/" element={<Assistant />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/home" element={<Assistant />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SettingsProvider>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

// Gỡ màn boot tĩnh trong index.html — React đã render xong
(window as unknown as { __dsBootDone?: () => void }).__dsBootDone?.();
