import { motion } from "framer-motion";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col bg-background"
    >
      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
              <p className="text-lg text-muted-foreground">
                Không tìm thấy trang
              </p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex items-center rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
