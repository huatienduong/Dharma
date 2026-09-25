import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";

type AppLogoProps = {
  className?: string;
  alt?: string;
};

/**
 * Logo chính thức của ứng dụng, lấy trực tiếp từ Convex Storage.
 * Component này cũng đồng bộ favicon và apple-touch-icon để logo được dùng
 * nhất quán trên toàn bộ giao diện web.
 */
export function AppLogo({ className, alt = "Logo Trợ lý Phật học" }: AppLogoProps) {
  const logoUrl = useQuery(api.library.getAppLogo, {});
  const src = logoUrl ?? "/app-icon.svg";

  useEffect(() => {
    if (!logoUrl || typeof document === "undefined") return;
    for (const rel of ["icon", "apple-touch-icon"]) {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    }
  }, [logoUrl]);

  return <img src={src} alt={alt} className={className} />;
}
