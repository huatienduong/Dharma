import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { DockPlayer } from "@/lib/player";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import { APP_DEVELOPER, APP_NAME, APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";
import {
  BookMarked,
  BookOpen,
  Bot,
  CalendarDays,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  MonitorPlay,
  RefreshCw,
  Scale,
  Tv,
} from "lucide-react";
import { DHAMMAPADA, type DhpVerse } from "@/data/dhammapada";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* Các mục chức năng chính thức trên trang chủ — Kinh · Luật · Luận cạnh nhau */
const MAIN_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { to: "/suttas", label: "Kinh", icon: BookOpen },
  { to: "/vinaya", label: "Luật", icon: Scale },
  { to: "/abhidhamma", label: "Luận", icon: Layers },
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay },
  { to: "/tv", label: "Truyền hình", icon: Tv },
  { to: "/meditation", label: "Thiền", icon: Flower2 },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked },
  { to: "/calendar", label: "Phật lịch", icon: CalendarDays },
  { to: "/lookup", label: "Tra cứu", icon: Globe2 },
  { to: "/assistant", label: "Trợ lý", icon: Bot },
  { to: "/history", label: "Lịch sử\nPhật giáo", icon: Hourglass },
  { to: "/watched", label: "Lịch sử xem", icon: History },
];

/* Ảnh Đức Phật Thích Ca — Wikimedia Commons (đã xác minh 200 OK) */
const BUDDHA_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tian_Tan_Buddha_by_Beria.jpg/960px-Tian_Tan_Buddha_by_Beria.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Buddha_statue_at_Buddha_Park_of_Ravangla%2C_Sikkim%2C_India_%281%29.jpg/960px-Buddha_statue_at_Buddha_Park_of_Ravangla%2C_Sikkim%2C_India_%281%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Large_Gautama_Buddha_statue_in_Buddha_Park_of_Ravangla%2C_Sikkim.jpg/960px-Large_Gautama_Buddha_statue_in_Buddha_Park_of_Ravangla%2C_Sikkim.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Vairocana_Buddha_statue.jpg/960px-Vairocana_Buddha_statue.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Three_golden_statues_of_the_Buddha_at_Wat_Mai_with_colorful_clouds_at_sunset_in_Luang_Prabang_Laos.jpg/960px-Three_golden_statues_of_the_Buddha_at_Wat_Mai_with_colorful_clouds_at_sunset_in_Luang_Prabang_Laos.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Interior_of_Wat_Long_Koon_with_gold_statue_of_the_seated_Buddha_in_Luang_Prabang_Laos.jpg/960px-Interior_of_Wat_Long_Koon_with_gold_statue_of_the_seated_Buddha_in_Luang_Prabang_Laos.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Seated_wooden_statue_of_Sakyamuni_Buddha_%28Fumonji_Temple%29.jpg/960px-Seated_wooden_statue_of_Sakyamuni_Buddha_%28Fumonji_Temple%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/A_Seated_Buddha_statue_%28Gupta_temple%29.JPG/960px-A_Seated_Buddha_statue_%28Gupta_temple%29.JPG",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Clay_Seated_Buddha_of_Buseoksa_03.jpg/960px-Clay_Seated_Buddha_of_Buseoksa_03.jpg",
];

export default function Home() {
  const navigate = useNavigate();

  /* Câu Pháp Cú + ảnh Đức Phật — chọn ngẫu nhiên, ổn định trong phiên */
  const [verse] = useState<DhpVerse>(
    () => DHAMMAPADA[Math.floor(Math.random() * DHAMMAPADA.length)],
  );
  const [buddhaImg] = useState(() =>
    BUDDHA_IMAGES[Math.floor(Math.random() * BUDDHA_IMAGES.length)],
  );

  useEffect(() => {
    const stop = trackScroll("home");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("home");
  }, []);

  return (
    <AppShell title="Trang chủ" hideTitle>
      <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
        <DockPlayer />
      </div>

      {/* ---------------- HERO: ảnh Đức Phật Thích Ca ---------------- */}
      <section className="ds-card relative mb-4 overflow-hidden">
        <div className="relative h-52 w-full overflow-hidden bg-muted sm:h-64">
          <img
            src={buddhaImg}
            alt="Đức Phật Thích Ca"
            loading="eager"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#3f3221]/70 via-[#3f3221]/35 to-transparent"
          />
        </div>
      </section>

      {/* -------- Trích Kinh Pháp Cú — thẻ tinh gọn, cân đối -------- */}
      <section className="ds-card relative mb-4 overflow-hidden px-6 py-5">
        {/* Hoa sen trang trí hai đầu kẻ mảnh */}
        <div aria-hidden className="flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gold/35" />
          <span className="text-sm text-gold">🪷</span>
          <span className="h-px w-12 bg-gold/35" />
        </div>

        <blockquote className="mt-3 text-center">
          <p className="readable-serif mx-auto max-w-xl text-[15px] leading-[1.9] text-foreground/95">
            “{verse.vi}”
          </p>
          <footer className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Kinh Pháp Cú · Câu {verse.n} — Đức Phật Thích Ca Mâu Ni
          </footer>
          <p className="mx-auto mt-2.5 max-w-xl text-[12px] italic leading-relaxed text-muted-foreground/85">
            «{verse.pali}»
          </p>
        </blockquote>
      </section>

      {/* -------- Lưới các mục chức năng chính thức -------- */}
      <section className="ds-card mb-4 px-3 py-6">
        <div className="grid grid-cols-3 gap-y-6 sm:grid-cols-4">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to + item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2.5 px-1 text-center transition active:scale-95"
              >
                <span className="ds-tile h-[58px] w-[58px] shadow-[0_2px_8px_rgba(63,50,33,0.08)]">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <HomeFooter />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Chân trang: nhà phát triển + phiên bản + kiểm tra cập nhật          */
/* (đồng bộ nội dung với mục "Giới thiệu" trong Cài đặt)               */
/* ------------------------------------------------------------------ */

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

function HomeFooter() {
  const meta = useQuery(api.library.getAppVersion, {});
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const latest = meta?.latestVersion ?? APP_VERSION;
  const hasUpdate = compareVersions(latest, APP_VERSION) > 0;

  const check = () => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      setChecked(true);
    }, 600);
  };

  return (
    <footer className="mb-6 px-2 pb-2 text-center">
      <p className="text-[13px] font-semibold text-foreground/90">
        Nhà phát triển ứng dụng: {APP_DEVELOPER}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {APP_NAME} · Phiên bản {APP_VERSION}
      </p>

      <div className="mt-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={check}
          disabled={checking}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold text-foreground/85 transition hover:bg-accent disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", checking && "animate-spin")}
          />
          {checking ? "Đang kiểm tra…" : "Kiểm tra cập nhật"}
        </button>

        {checked &&
          (hasUpdate ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Có phiên bản mới {latest} — Tải bản mới
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Bạn đang dùng phiên bản mới nhất.
            </p>
          ))}
      </div>
    </footer>
  );
}
