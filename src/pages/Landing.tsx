import { DhammaWheel } from "@/components/DhammaWheel";
import { APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Heart,
  History,
  ListVideo,
  Play,
  Radio,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";

const FEATURES = [
  {
    icon: ListVideo,
    title: "Pháp thoại mới mỗi ngày",
    desc: "Tổng hợp từ các kênh Theravāda chính thống: Sư Hạnh Tuệ, Tỳ khưu Thiện Hảo, Ngài Thích Minh Châu, Thiền sư Pa Auk…",
  },
  {
    icon: Play,
    title: "Trình phát tích hợp",
    desc: "Xem và nghe ngay trong ứng dụng — không cần chuyển sang YouTube.",
  },
  {
    icon: History,
    title: "Ghi nhớ tiến trình",
    desc: "Tạm dừng ở đâu, quay lại ứng dụng tiếp tục ở đó — tự động lưu.",
  },
  {
    icon: Radio,
    title: "Nghe nền",
    desc: "Tắt màn hình hoặc chuyển tab, âm thanh pháp thoại vẫn tiếp tục.",
  },
  {
    icon: BookOpen,
    title: "Kinh tạng & Luật tạng",
    desc: "Học Kinh, Luận giải, Chú giải, tra cứu Luật Pātimokkha và Từ điển Phật học chuyên ngành.",
  },
  {
    icon: Calendar,
    title: "Lịch Phật giáo",
    desc: "Âm lịch, Can Chi, Phật lịch, lễ hội và ngày Uposatha — tra cứu nhanh mọi lúc.",
  },
  {
    icon: Heart,
    title: "Thiền định",
    desc: "Hướng dẫn từng bước Anapānasati, Mettā, Maranāsati, Thiền hành — thực hành ngay với bộ đếm thời gian.",
  },
] as const;

export default function Landing() {
  return (
    <div className="lotus-bg flex min-h-screen flex-col">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <DhammaWheel size={38} />
            <div>
              <p className="text-sm font-bold leading-tight">Dhamma Stream</p>
              <p className="text-[11px] text-muted-foreground">
                Theravāda — Phật giáo Nguyên thủy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Đăng nhập</Link>
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link to="/auth">
                <Sparkles className="h-4 w-4" />
                Bắt đầu nghe
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >            <DhammaWheel size={92} className="mb-6 drop-shadow-lg" />
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link to="/auth">
                  <Play className="h-5 w-5 fill-current" />
                  Nghe pháp thoại
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Đăng nhập</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Miễn phí · Không cần cài đặt · Có thể tiếp tục với khách vãng lai
            </p>
          </motion.div>
        </section>

        {/* ---------- Trải nghiệm nổi bật ---------- */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition hover:border-gold/40"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- Trích dẫn ---------- */}
        <section className="mx-auto max-w-3xl px-4 pb-20">
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-gold/25 bg-card/50 p-8 text-center backdrop-blur-sm"
          >
            <p className="text-base italic leading-relaxed text-foreground/90 sm:text-lg">
              “Hận thù ở đời không bao giờ hết,
              nếu lấy hận thù mà trả thù;
              bỏ hận thù mới được hết hận,
              ấy là luật pháp ngàn xưa.”
            </p>
            <footer className="mt-3 text-xs text-muted-foreground">
              — Kinh Pháp Cú, bản dịch Tỳ khưu Thích Minh Châu
            </footer>
          </motion.blockquote>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border/50 bg-card/40 py-6 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs leading-relaxed text-muted-foreground">
          <p>
            Nhà phát triển: {" "}
            <span className="font-medium text-foreground/80">Hứa Tiến Dương</span>{" "}
            · Phiên bản {APP_VERSION}
          </p>
        </div>
      </footer>
    </div>
  );
}
