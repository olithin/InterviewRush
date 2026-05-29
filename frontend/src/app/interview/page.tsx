import Link from "next/link";
import { FileCode, Shapes } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { INTERVIEW_LANGUAGE_TRACK_IDS, INTERVIEW_LANGUAGE_TRACKS } from "@/lib/interview-language-tracks";
import { cn } from "@/lib/utils";

const hubCard =
  "clay-surface group flex flex-col rounded-[1.6rem] border border-white/65 bg-gradient-to-b from-[hsl(48,48%,99%)] to-[hsl(40,32%,94%)] p-5 shadow-clay ring-1 ring-inset ring-amber-50/45 transition hover:brightness-[1.02]";

export default function InterviewHubPage() {
  return (
    <div className="space-y-6">
      <PageTitle
        title="Interview preparation"
        subtitle="Четыре трека: три языка плюс отдельный общий блок ООП. В универсальных ООП-вопросах приводи контрасты и примеры на разных языках прямо в ответе."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {INTERVIEW_LANGUAGE_TRACK_IDS.map((id) => {
          const t = INTERVIEW_LANGUAGE_TRACKS[id];
          const href = `/interview/${t.segment}`;
          const isOop = id === "oop";
          return (
            <Link
              key={id}
              href={href}
              className={cn(
                hubCard,
                isOop && "border-emerald-200/60 ring-emerald-100/40"
              )}
            >
              <div
                className={cn(
                  "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                  isOop ? "bg-emerald-500/15 text-emerald-800" : "bg-primary/10 text-primary"
                )}
              >
                {isOop ? (
                  <Shapes className="h-5 w-5" aria-hidden />
                ) : (
                  <FileCode className="h-5 w-5" aria-hidden />
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground">{t.shortLabel}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.hubDescription}</p>
              <span
                className={cn(
                  "mt-4 text-sm font-semibold group-hover:underline",
                  isOop ? "text-emerald-800" : "text-primary"
                )}
              >
                {isOop ? "Open universal OOP track →" : `Open ${t.shortLabel.split(" · ")[0]} track →`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
