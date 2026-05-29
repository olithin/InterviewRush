"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Cog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const UI_FONT_KEY = "qa-quest-ui-font";
export const UI_TEXT_SIZE_KEY = "qa-quest-ui-text-size";

const FONT_CHOICES: { id: string; label: string; hint: string }[] = [
  { id: "varela-round", label: "Varela Round", hint: "Default — round & calm" },
  { id: "system", label: "System default", hint: "OS / browser default sans" },
  { id: "quicksand", label: "Quicksand", hint: "Round, clean" },
  { id: "nunito", label: "Nunito", hint: "Very readable, soft" },
  { id: "fredoka", label: "Fredoka", hint: "Playful, cartoon" },
  { id: "comic-neue", label: "Comic Neue", hint: "Friendly comic, legible" },
  { id: "baloo-2", label: "Baloo 2", hint: "Bold & bouncy" }
];

const TEXT_SIZES: { id: string; label: string; pct: string }[] = [
  { id: "s", label: "S", pct: "95%" },
  { id: "md", label: "Default", pct: "106%" },
  { id: "l", label: "L", pct: "112%" },
  { id: "xl", label: "XL", pct: "120%" },
  { id: "xxl", label: "XXL", pct: "128%" }
];

function readStored(id: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(id) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(id: string, value: string) {
  try {
    localStorage.setItem(id, value);
  } catch {
    // ignore
  }
}

function applyToDocument(fontId: string, sizeId: string) {
  document.documentElement.setAttribute("data-font", fontId);
  document.documentElement.setAttribute("data-text-size", sizeId);
}

function resolveInitial() {
  const font = readStored(UI_FONT_KEY, "varela-round");
  const size = readStored(UI_TEXT_SIZE_KEY, "xxl");
  const validFont = FONT_CHOICES.some((f) => f.id === font) ? font : "varela-round";
  const validSize = TEXT_SIZES.some((s) => s.id === size) ? size : "xxl";
  if (font !== validFont) {
    writeStored(UI_FONT_KEY, validFont);
  }
  if (size !== validSize) {
    writeStored(UI_TEXT_SIZE_KEY, validSize);
  }
  return { font: validFont, size: validSize };
}

type AppearanceMenuProps = { className?: string };

export function AppearanceMenu({ className }: AppearanceMenuProps) {
  const [open, setOpen] = useState(false);
  const [fontId, setFontId] = useState("varela-round");
  const [sizeId, setSizeId] = useState("xxl");
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { font, size } = resolveInitial();
    setFontId(font);
    setSizeId(size);
    applyToDocument(font, size);
  }, []);

  const sync = useCallback((nextFont: string, nextSize: string) => {
    setFontId(nextFont);
    setSizeId(nextSize);
    writeStored(UI_FONT_KEY, nextFont);
    writeStored(UI_TEXT_SIZE_KEY, nextSize);
    applyToDocument(nextFont, nextSize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative z-20", className)} ref={rootRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 min-w-10 gap-0 rounded-full px-3"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Text & display"
        onClick={() => setOpen((v) => !v)}
      >
        <Cog className="h-4 w-4" aria-hidden />
        <span className="sr-only">Open display settings</span>
      </Button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-[200] mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-white/60 bg-gradient-to-b from-[hsl(48,48%,99%)] to-[hsl(40,36%,96%)] p-4 shadow-clay ring-1 ring-amber-50/50"
          role="dialog"
          aria-label="Display settings"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Display</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-white/50 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Font (readable + playful)</p>
          <ul className="mb-4 max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
            {FONT_CHOICES.map((f) => (
              <li key={f.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-xl border border-transparent px-2 py-1.5 transition",
                    fontId === f.id
                      ? "border-amber-200/80 bg-white/60 shadow-sm"
                      : "hover:border-white/50 hover:bg-white/30"
                  )}
                >
                  <input
                    type="radio"
                    className="mt-0.5"
                    name="qa-quest-font"
                    checked={fontId === f.id}
                    onChange={() => sync(f.id, sizeId)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Text size</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Text size">
            {TEXT_SIZES.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="secondary"
                className={cn(
                  "min-w-[3rem] rounded-full px-2 text-xs",
                  sizeId === s.id && "ring-2 ring-primary/50 ring-offset-1 ring-offset-[hsl(48,48%,99%)]"
                )}
                onClick={() => sync(fontId, s.id)}
                title={s.pct}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
