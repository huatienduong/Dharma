import { AppShell, ShellBackButton } from "@/components/AppShell";
import { getVinayaDoc, VINAYA_DOCS } from "@/data/vinaya";
import { Scale } from "lucide-react";
import { useNavigate, useParams } from "react-router";

export default function Vinaya() {
  const navigate = useNavigate();

  return (
    <AppShell
      title="Luật tạng"
      subtitle="Vinaya Piṭaka — nền giới hạnh của Tăng-già theo truyền thống Theravāda"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {VINAYA_DOCS.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => navigate(`/vinaya/${doc.id}`)}
            className="group flex h-full flex-col rounded-xl border border-border/60 bg-card/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <Scale className="h-4.5 w-4.5 text-primary" />
            </span>
            <h3 className="mt-3 text-sm font-semibold group-hover:text-primary">
              {doc.title}
            </h3>
            <p className="text-[11px] italic text-muted-foreground">
              {doc.subtitle}
            </p>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
              {doc.summary}
            </p>
          </button>
        ))}
      </div>
    </AppShell>
  );
}

export function VinayaReader() {
  const { id } = useParams();
  const doc = id ? getVinayaDoc(id) : undefined;

  if (!doc) {
    return (
      <AppShell title="Luật tạng">
        <p className="text-sm text-muted-foreground">Không tìm thấy tài liệu.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={doc.title}
      subtitle={doc.subtitle}
      actions={<ShellBackButton />}
    >
      <div className="mb-5 rounded-xl border border-border/60 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
        {doc.summary}
      </div>

      <div className="space-y-5">
        {doc.sections.map((sec, i) => (
          <section key={i}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h3 className="text-sm font-semibold">{sec.name}</h3>
              {sec.count && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                  {sec.count} điều
                </span>
              )}
              <span className="text-[11px] italic text-muted-foreground">
                {sec.pali}
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5">
              {sec.content.map((p, j) => (
                <p key={j} className="text-[15px] leading-[1.9] text-foreground/90">
                  {p}
                </p>
              ))}
              {sec.rules && (
                <ul className="space-y-2 border-t border-border/50 pt-3">
                  {sec.rules.map((r, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-[13px] leading-relaxed text-foreground/85"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
