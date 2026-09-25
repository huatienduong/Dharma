import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { ChatScreenShield } from "@/components/ChatScreenShield";
import { ConvexHealth } from "@/components/ConvexHealth";
import { DeviceGuard } from "@/components/DeviceGuard";
import { ServiceNotice } from "@/components/ServiceNotice";
import { SplashScreen } from "@/components/SplashScreen";
import { LegalConsentGate } from "@/components/LegalConsentGate";
import { UpdateChecker } from "@/components/UpdateChecker";
import { SettingsProvider } from "@/lib/settings";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Bot, Wrench } from "lucide-react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import { startContentProtection } from "@/lib/contentProtection";

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
            <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <Bot className="h-9 w-9" />
              <Wrench className="absolute bottom-1 right-1 h-4 w-4 animate-pulse" />
            </span>
            <h2 className="mt-4 text-lg font-bold tracking-tight">
              Trợ lý Phật học đang được nâng cấp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Đội ngũ kỹ thuật đang tiến hành nâng cấp hệ thống hoặc ứng dụng đang gặp vấn đề sự cố tạm thời. Xin vui lòng quay lại sau!
            </p>
            <div className="mt-5 flex justify-center">
              <a
                href={`${ROUTER_BASENAME === "/" ? "" : ROUTER_BASENAME}/settings?section=feedback`}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
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
const DHARMA_CONVEX_URL = "https://determined-rabbit-619.convex.cloud";
const convex = new ConvexReactClient(DHARMA_CONVEX_URL);

// SỬA LỖI TRẮNG TRANG trên domain riêng: basename phải tự động theo nơi app
// được phục vụ — nền tảng chạy dưới /dharma, còn dharma.freebuff.app phục vụ
// ở gốc /. Baseline sai → không route nào khớp → trang render rỗng.
const ROUTER_BASENAME = window.location.pathname.startsWith("/dharma")
  ? "/dharma"
  : "/";

// Đăng ký service worker để ứng dụng có thể cài trực tiếp và mở lại nhanh hơn.
if ("serviceWorker" in navigator) {
  const appBase = ROUTER_BASENAME === "/" ? "/" : `${ROUTER_BASENAME}/`;
  window.addEventListener(
    "load",
    () => {
      void navigator.serviceWorker
        .register(`${appBase}sw.js`, { scope: appBase })
        .catch(() => {
          /* Trình duyật không hỗ trợ cài đặt vẫn sử dụng ứng dụng bình thường. */
        });
    },
    { once: true },
  );
}


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
        {/* Splash logo chính thức — hiện ngay từ giây đầu khi vào ứng dụng.
            PHẢI nằm trong ConvexAuthProvider vì dùng useQuery lấy logo;
            đặt ngoài provider làm hook ném lỗi → toàn cây bị gỡ → TRẮNG TRANG. */}
        <SplashScreen />
        <SettingsProvider>
          <LegalConsentGate />
          <UpdateChecker />
          {/* Chặn thiết bị tự động hóa / bị can thiệp — khóa toàn màn hình */}
          <DeviceGuard />
          <BrowserRouter basename={ROUTER_BASENAME}>
            <RouteSyncer />
            {/* Thông báo mất kết nối / nâng cấp hệ thống / sự cố tạm thời */}
            <ServiceNotice />
            {/* Khiên chống chụp/quay màn hình khu vực hội thoại */}
            <ChatScreenShield />
            {/* Máy chủ không trả dữ liệu quá lâu (bundle cũ, deployment đổi) →
                màn phục hồi thay vì treo im lặng "không tra cứu được gì" */}
            <ConvexHealth />
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

// KHÓA NỘI DUNG: chặn hoàn toàn sao chép văn bản trong ứng dụng (copy, cut,
// menu chuột phải, kéo thả, bôi đen, Ctrl+C/X/A). Không đụng tới ô nhập.
startContentProtection();
