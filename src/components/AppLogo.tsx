import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";

const FALLBACK_LOGO_URL =
  "https://determined-rabbit-619.convex.cloud/api/storage/kg28vmks2ffwhk14575s6jnvws8f3n8z";

type AppLogoProps = {
  className?: string;
  alt?: string;
};

type ManifestIcon = {
  src?: string;
  sizes?: string;
  type?: string;
  purpose?: string;
};

/**
 * Logo chính thức của ứng dụng, lấy trực tiếp từ Convex Storage.
 * Component này cũng đồng bộ favicon, apple-touch-icon và manifest PWA
 * để logo mới được dùng nhất quán trên toàn bộ ứng dụng.
 */
export function AppLogo({ className, alt = "Logo Trợ lý Phật học" }: AppLogoProps) {
  const logoUrl = useQuery(api.library.getAppLogo, {});
  const src = logoUrl ?? FALLBACK_LOGO_URL;

  useEffect(() => {
    if (typeof document === "undefined") return;

    for (const rel of ["icon", "apple-touch-icon"]) {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = src;
      link.type = "";
    }

    // Manifest thường được đọc trước React mount. Cập nhật lại manifest
    // sau khi query trả URL để icon PWA không bị giữ lại Storage ID cũ.
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) return;
    const manifestHref = manifestLink.href;

    void fetch(manifestHref, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Không đọc được manifest");
        return response.json() as Promise<Record<string, unknown>>;
      })
      .then((manifest) => {
        const existingIcons = Array.isArray(manifest.icons)
          ? (manifest.icons as ManifestIcon[])
          : [];
        const icons = existingIcons.length
          ? existingIcons.map((icon) => ({
              src,
              sizes: icon.sizes,
              purpose: icon.purpose,
            }))
          : [
              {
                src,
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src,
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
              },
            ];

        // Blob manifest không có URL gốc để resolve đường dẫn tương đối,
        // nên chuyển các trường PWA quan trọng thành URL tuyệt đối trước khi tạo blob.
        const absoluteUrl = (value: unknown) =>
          typeof value === "string" ? new URL(value, manifestHref).href : value;
        const nextManifest = {
          ...manifest,
          id: absoluteUrl(manifest.id ?? "./"),
          start_url: absoluteUrl(manifest.start_url ?? "./"),
          scope: absoluteUrl(manifest.scope ?? "./"),
          icons,
        };
        const nextManifestUrl = URL.createObjectURL(
          new Blob([JSON.stringify(nextManifest)], {
            type: "application/manifest+json",
          }),
        );
        manifestLink.href = nextManifestUrl;
      })
      .catch(() => {
        // Manifest tĩnh vẫn giữ icon dự phòng nếu trình duyệt chặn blob manifest.
      });
  }, [src]);

  return <img src={src} alt={alt} className={className} />;
}
