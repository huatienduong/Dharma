import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { DhammaWheel } from "@/components/DhammaWheel";
import { APP_VERSION, APP_DEVELOPER } from "@/lib/version";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"form" | { email: string }>("form");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email submit error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Không gửi được mã xác thực. Vui lòng thử lại.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) =>
  {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Mã xác thực không đúng. Vui lòng kiểm tra lại.");
      setIsLoading(false);
      setOtp("");
    }
  };

  return (
    <div className="lotus-bg flex min-h-screen flex-col items-center justify-center p-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-6 flex flex-col items-center gap-2"
        aria-label="Về trang chủ"
      >
        <DhammaWheel size={64} />
        <span className="text-sm font-semibold">Dharma</span>
        <span className="text-xs text-muted-foreground">Giới - Định - Tuệ</span>
      </button>

      <Card className="w-full max-w-sm pb-0">
        {step === "form" ? (
          <>
            {/* Tabs Đăng nhập / Đăng ký */}
            <div className="grid grid-cols-2 border-b border-border/60">
              {(
                [
                  { key: "signin", label: "Đăng nhập" },
                  { key: "signup", label: "Đăng ký" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setMode(t.key);
                    setError(null);
                  }}
                  className={cn(
                    "py-3 text-sm font-medium transition",
                    mode === t.key
                      ? "border-b-2 border-gold text-foreground"
                      : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
              </CardTitle>
              <CardDescription>
                {mode === "signin"
                  ? "Đăng nhập để tiếp tục nghe pháp thoại và giữ nguyên tiến trình của bạn"
                  : "Đăng ký bằng email để lưu tiến trình xem, thiền và đọc trên mọi thiết bị"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailSubmit}>
              <CardContent>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="email"
                      placeholder="ten@vidu.com"
                      type="email"
                      className="pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </CardContent>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="mt-4 text-center">
              <CardTitle>Kiểm tra email</CardTitle>
              <CardDescription>
                {mode === "signup" ? "Mã kích hoạt tài khoản đã gửi tới " : "Mã xác thực đã gửi tới "}
                {step.email}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleOtpSubmit}>
              <CardContent className="pb-4">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        otp.length === 6 &&
                        !isLoading
                      ) {
                        const form = (e.target as HTMLElement).closest("form");
                        form?.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="mt-2 text-center text-sm text-destructive">
                    {error}
                  </p>
                )}
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Chưa nhận được mã?{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setStep("form")}
                  >
                    Gửi lại
                  </Button>
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xác thực…
                    </>
                  ) : (
                    <>
                      Xác nhận
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("form")}
                  disabled={isLoading}
                  className="w-full"
                >
                  Dùng email khác
                </Button>
              </CardFooter>
            </form>
          </>
        )}

        <div className="border-t bg-muted/60 px-6 py-3 text-center text-[11px] text-muted-foreground">
          <p className="rounded-b-lg">
            Dharma · Phiên bản {APP_VERSION} · {APP_DEVELOPER}
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
