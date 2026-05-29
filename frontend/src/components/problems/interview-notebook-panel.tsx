"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, ImagePlus, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export function interviewNotebookStorageKey(id: number): string {
  return `qa-quest:interview:notebook:html:${id}`;
}

function stripScripts(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
}

/** Read from localStorage first, then session (fallback if only session fit after quota). */
function readPersistedHtml(key: string): string {
  let s = "";
  try {
    s = localStorage.getItem(key) ?? "";
  } catch {
    s = "";
  }
  if (s) return s;
  try {
    s = sessionStorage.getItem(key) ?? "";
  } catch {
    s = "";
  }
  return s;
}

/** Prefer localStorage; on any write failure, try sessionStorage (same key). */
function writePersistedHtml(
  key: string,
  raw: string
): { ok: boolean; where: "local" | "session" | "none" } {
  const cleaned = stripScripts(raw);
  try {
    localStorage.setItem(key, cleaned);
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
    return { ok: true, where: "local" };
  } catch {
    try {
      sessionStorage.setItem(key, cleaned);
      return { ok: true, where: "session" };
    } catch {
      return { ok: false, where: "none" };
    }
  }
}

const WRAP_BASE =
  "notebook-img-wrap group relative my-2 max-w-full align-top [vertical-align:top]";
const DELETE_BTN_CLASS =
  "absolute -right-1.5 -top-1.5 z-20 flex h-6 w-6 cursor-pointer select-none items-center justify-center rounded-full border border-slate-300/90 bg-white text-sm font-bold leading-none text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700";

/** Editor-level styles for in-notebook images: size is controlled by the resizable wrapper (inline style + resize handle). */
const EDITOR_IMAGE_RESPONSIVE =
  "[&_.notebook-img-wrap>img]:!my-0 [&_.notebook-img-wrap>img]:block [&_.notebook-img-wrap>img]:h-auto [&_.notebook-img-wrap>img]:!w-full [&_.notebook-img-wrap>img]:!max-w-full [&_.notebook-img-wrap>img]:!max-h-full [&_.notebook-img-wrap>img]:!rounded-lg [&_.notebook-img-wrap>img]:object-contain [&_.notebook-img-wrap>img]:cursor-zoom-in";

function applyNotebookImageWrapperLayout(span: HTMLSpanElement) {
  if (!span.style.maxWidth) {
    span.style.maxWidth = "min(100%, 32rem)";
  }
  if (!span.style.minWidth) {
    span.style.minWidth = "7.5rem";
  }
  if (!span.style.minHeight) {
    span.style.minHeight = "5rem";
  }
  span.style.resize = "both";
  span.style.overflow = "auto";
  span.style.display = "inline-block";
  span.style.verticalAlign = "top";
}

function createNotebookImageElement(src: string, alt: string, withReferrerPolicy: boolean) {
  const span = document.createElement("span");
  span.setAttribute("contenteditable", "false");
  span.setAttribute("data-notebook-image", "");
  span.className = WRAP_BASE;
  applyNotebookImageWrapperLayout(span);
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  if (withReferrerPolicy) {
    img.referrerPolicy = "no-referrer";
  }
  img.className = "block h-auto w-full max-h-full min-h-0 rounded-lg object-contain";
  img.setAttribute("draggable", "false");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Remove image");
  btn.className = DELETE_BTN_CLASS;
  btn.appendChild(document.createTextNode("×"));
  span.appendChild(img);
  span.appendChild(btn);
  return span;
}

/** Wrap bare <img> nodes with a delete control (for loaded HTML and legacy notes). */
function enhanceImagesInEditor(root: HTMLElement) {
  const list = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  for (const img of list) {
    if (img.closest("span[data-notebook-image]")) {
      continue;
    }
    const parent = img.parentNode;
    if (!parent) {
      continue;
    }
    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");
    span.setAttribute("data-notebook-image", "");
    span.className = WRAP_BASE;
    applyNotebookImageWrapperLayout(span);
    parent.insertBefore(span, img);
    span.appendChild(img);
    if (!img.className?.includes("object-contain")) {
      img.className = "block h-auto w-full max-h-full min-h-0 rounded-lg object-contain";
    }
    img.setAttribute("draggable", "false");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Remove image");
    btn.className = DELETE_BTN_CLASS;
    btn.appendChild(document.createTextNode("×"));
    span.appendChild(btn);
  }
  root.querySelectorAll<HTMLSpanElement>("span[data-notebook-image]").forEach(ensureNotebookImageWrapperFromDom);
}

function ensureNotebookImageWrapperFromDom(span: HTMLSpanElement) {
  if (!span.classList.contains("notebook-img-wrap")) {
    span.classList.add("notebook-img-wrap", "group", "relative", "my-2", "max-w-full", "align-top");
  }
  applyNotebookImageWrapperLayout(span);
  const im = span.querySelector("img");
  if (im) {
    if (!im.className?.includes("object-contain")) {
      im.className = "block h-auto w-full max-h-full min-h-0 rounded-lg object-contain";
    }
    im.setAttribute("draggable", "false");
  }
}

/** Pasted photos/infographics as raw data: URLs exceed localStorage; shrink dimensions + JPEG so the whole note can persist. */
const TARGET_PASTE_DATA_URL_MAX_CHARS = 700_000;
const PASTE_MAX_IMAGE_EDGE_START = 1680;

function compressRasterFileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type.includes("svg")) {
      const r = new FileReader();
      r.onload = () => resolve((typeof r.result === "string" && r.result) || "");
      r.onerror = () => resolve("");
      r.readAsDataURL(file);
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      const src = fr.result;
      if (typeof src !== "string" || !src) {
        resolve("");
        return;
      }
      if (src.length < 60_000) {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (iw < 1 || ih < 1) {
          resolve(src);
          return;
        }
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        let maxEdge = PASTE_MAX_IMAGE_EDGE_START;
        for (let pass = 0; pass < 16; pass++) {
          const rScale = Math.min(1, maxEdge / Math.max(iw, ih));
          const w = Math.max(1, Math.round(iw * rScale));
          const h = Math.max(1, Math.round(ih * rScale));
          canvas.width = w;
          canvas.height = h;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          for (let q = 0.84; q >= 0.38; q -= 0.07) {
            const j = canvas.toDataURL("image/jpeg", q);
            if (j.length <= TARGET_PASTE_DATA_URL_MAX_CHARS) {
              resolve(j);
              return;
            }
          }
          maxEdge = Math.max(400, Math.floor(maxEdge * 0.78));
        }
        resolve(canvas.toDataURL("image/jpeg", 0.35));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    fr.onerror = () => resolve("");
    fr.readAsDataURL(file);
  });
}

function insertAtCursor(el: HTMLDivElement, node: Node) {
  const sel = window.getSelection();
  if (sel && sel.getRangeAt && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer) && r.commonAncestorContainer !== el) {
      el.appendChild(node);
      el.appendChild(document.createElement("br"));
    } else {
      r.deleteContents();
      r.insertNode(node);
      r.setStartAfter(node);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  } else {
    el.appendChild(node);
    el.appendChild(document.createElement("br"));
  }
  // React 18+ onInput: native InputEvent is more reliable than `new Event("input")` for contenteditable.
  try {
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: " " } as InputEventInit)
    );
  } catch {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/** Responsive 16:9 box; max width keeps embeds from spanning the full editor. */
const NOTEBOOK_YT_WRAP_CLASS = "my-3 w-full max-w-lg mx-auto";

const NOTEBOOK_EXT_LINK_CLASS =
  "my-2 w-full max-w-lg mx-auto rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-sm shadow-sm";

/** Single-line http(s) URL (e.g. docs or reference links — opens in a new tab, no embeds). */
function parseSingleLineHttpsUrl(plain: string): string | null {
  const t = plain.trim();
  if (!t || /\n/.test(t) || /\s/.test(t)) {
    return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function createExternalLinkCard(href: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.setAttribute("data-notebook-external-link", "");
  wrap.contentEditable = "false";
  wrap.className = NOTEBOOK_EXT_LINK_CLASS;
  let hostLabel = "link";
  try {
    const u = new URL(href);
    const h = u.hostname.toLowerCase();
    if (h === "www.youtube.com" || h === "youtube.com" || h === "youtu.be" || h.endsWith(".youtube.com")) {
      hostLabel = "YouTube";
    } else if (h === "notebooklm.google.com" || h.endsWith(".notebooklm.google.com")) {
      hostLabel = "NotebookLM";
    } else {
      hostLabel = h.replace(/^www\./, "") || "link";
    }
  } catch {
    // keep default
  }
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "font-medium text-primary underline underline-offset-2 hover:text-primary/90";
  a.textContent = `Open — ${hostLabel}`;
  const sub = document.createElement("p");
  sub.className = "mt-1 break-all text-[10px] text-slate-500 line-clamp-2";
  sub.textContent = href.length > 120 ? `${href.slice(0, 120)}…` : href;
  wrap.appendChild(a);
  wrap.appendChild(sub);
  return wrap;
}

type Props = {
  questionId: number;
  /** Optional link to the API-backed interview question form. */
  structuredEditHref?: string;
  /** Hides the title + description + toolbar row (e.g. in Coach mode). */
  hideHeader?: boolean;
  /** Fill remaining viewport height in the main column (parent must be a flex column with height). */
  fillViewport?: boolean;
  /**
   * When false (e.g. guest), the editor starts empty and does not read/write browser storage.
   * Default true for backward compatibility.
   */
  persistToBrowserStorage?: boolean;
};

/**
 * Inline notepad for C# Interview (Guided path). Hidden when the user leaves this tab
 * (e.g. Mental model) or switches to Practice mode — parent unmounts it.
 */
export function InterviewNotebookBlock({
  questionId,
  structuredEditHref,
  hideHeader = false,
  fillViewport = false,
  persistToBrowserStorage = true
}: Props) {
  const titleId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  /** Last known editor HTML — cleanup may run after the DOM ref is nulled; use for a final persist. */
  const lastHtmlRef = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const key = interviewNotebookStorageKey(questionId);

  const saveHtml = useCallback(() => {
    const el = editorRef.current;
    if (!el) return false;
    const raw = el.innerHTML;
    lastHtmlRef.current = raw;
    if (!persistToBrowserStorage) {
      return true;
    }
    const { ok, where } = writePersistedHtml(key, raw);
    if (ok) {
      setSaveError(null);
      if (where === "local") {
        setSaveWarning(null);
        return true;
      }
      setSaveWarning("Saved in this session only: long-term storage is full. Smaller images or free space, then save again.");
      return true;
    }
    setSaveError(
      "Could not save: browser storage is full or blocked. Pasted images are now compressed; remove old images, save again, or use «Image link» (URL) instead of paste for huge files."
    );
    return false;
  }, [key, persistToBrowserStorage]);

  /** Flush debounce and write to localStorage immediately (images, embeds, tab hide). */
  const persistNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    saveHtml();
  }, [saveHtml]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveHtml();
    }, 300);
  }, [saveHtml]);

  const onEditorInput = useCallback(() => {
    const el = editorRef.current;
    if (el) {
      enhanceImagesInEditor(el);
      lastHtmlRef.current = el.innerHTML;
    }
    scheduleSave();
  }, [scheduleSave]);

  const onEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      const del = t.closest("span[data-notebook-image] button");
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        const span = del.closest("span[data-notebook-image]");
        span?.remove();
        persistNow();
        return;
      }
      if (t.tagName === "IMG" && t.closest("span[data-notebook-image]")) {
        e.preventDefault();
        e.stopPropagation();
        const img = t as HTMLImageElement;
        const src = img.currentSrc || img.src;
        if (src) {
          setLightboxSrc(src);
        }
      }
    },
    [persistNow]
  );

  const onEditorMouseUp = useCallback(() => {
    const el = editorRef.current;
    if (el) {
      lastHtmlRef.current = el.innerHTML;
    }
    scheduleSave();
  }, [scheduleSave]);

  // useLayoutEffect: run after the contenteditable is attached so the ref is set; on unmount, DOM ref is more reliable for a final save than useEffect.
  useLayoutEffect(() => {
    const storageKey = key;
    setLoaded(false);
    let raf = 0;
    let attempts = 0;
    const maxAttempts = 12;

    const runLoad = () => {
      const el = editorRef.current;
      if (!el) {
        attempts += 1;
        if (attempts < maxAttempts) {
          raf = requestAnimationFrame(runLoad);
        }
        return;
      }
      const html = persistToBrowserStorage ? readPersistedHtml(storageKey) : "";
      el.innerHTML = html ? stripScripts(html) : "<p><br></p>";
      el.querySelectorAll('iframe[title="YouTube video"]').forEach((node) => {
        const w = node.parentElement;
        if (w) {
          w.className = NOTEBOOK_YT_WRAP_CLASS;
        }
      });
      enhanceImagesInEditor(el);
      lastHtmlRef.current = el.innerHTML;
      setLoaded(true);
    };

    runLoad();
    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const live = editorRef.current;
      if (live) {
        lastHtmlRef.current = live.innerHTML;
      }
      const raw = lastHtmlRef.current;
      if (persistToBrowserStorage) {
        writePersistedHtml(storageKey, raw);
      }
    };
  }, [key, questionId, persistToBrowserStorage]);

  // Autosave when the tab is hidden or the page is being discarded (complements debounce).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        persistNow();
      }
    };
    const onPageHide = () => persistNow();
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [persistNow]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setLightboxSrc(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !editorRef.current) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          e.preventDefault();
          const f = item.getAsFile();
          if (!f) continue;
          void (async () => {
            const dataUrl = await compressRasterFileToJpegDataUrl(f);
            const ed = editorRef.current;
            if (!ed) return;
            if (!dataUrl) {
              setSaveError("Could not read image from clipboard.");
              return;
            }
            insertAtCursor(ed, createNotebookImageElement(dataUrl, "Pasted", false));
            enhanceImagesInEditor(ed);
            lastHtmlRef.current = ed.innerHTML;
            persistNow();
          })();
          return;
        }
      }
      const plain = e.clipboardData.getData("text/plain");
      const html = e.clipboardData.getData("text/html");
      if (html && /<(?!img)[a-z!]/i.test(html) && editorRef.current) {
        e.preventDefault();
        const t = e.clipboardData.getData("text/plain");
        editorRef.current.focus();
        document.execCommand("insertText", false, t);
        scheduleSave();
        return;
      }
      const extUrl = plain ? parseSingleLineHttpsUrl(plain) : null;
      if (extUrl && editorRef.current) {
        e.preventDefault();
        insertAtCursor(editorRef.current, createExternalLinkCard(extUrl));
        persistNow();
        return;
      }
    },
    [persistNow, scheduleSave, setSaveError]
  );

  const addImageUrl = useCallback(() => {
    const raw = window.prompt("Image URL (https:// or http://):");
    if (!raw?.trim() || !editorRef.current) return;
    const u = raw.trim();
    if (!/^https?:\/\//i.test(u)) {
      window.alert("URL must start with http:// or https://");
      return;
    }
    insertAtCursor(editorRef.current, createNotebookImageElement(u, "Image", true));
    persistNow();
  }, [persistNow]);

  const addWebLink = useCallback(() => {
    const raw = window.prompt("Paste a public http(s) link (opens in a new tab):");
    if (!raw?.trim() || !editorRef.current) return;
    const u = parseSingleLineHttpsUrl(raw);
    if (!u) {
      window.alert("Enter a single http:// or https:// URL on one line.");
      return;
    }
    insertAtCursor(editorRef.current, createExternalLinkCard(u));
    persistNow();
  }, [persistNow]);

  return (
    <Card
      className={cn(
        "w-full min-w-0 overflow-hidden",
        fillViewport && "flex h-full min-h-0 flex-1 flex-col"
      )}
    >
      {hideHeader ? null : (
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle id={titleId} className="text-lg">
                My notebook
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {persistToBrowserStorage ? (
                  <>
                    Local to this browser. Drag the bottom edge to change height. Hidden on <strong>Mental model</strong> or{" "}
                    <strong>Practice</strong>.
                  </>
                ) : (
                  <>Sign in to save this notebook. Until then, the editor is empty and not stored.</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {structuredEditHref ? (
                <Button type="button" variant="secondary" size="sm" asChild>
                  <Link href={structuredEditHref}>Form (API)</Link>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={addWebLink}
                title="Insert link card (opens in new tab)"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Web link
              </Button>
              <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={addImageUrl} title="Image from URL">
                <ImagePlus className="h-3.5 w-3.5" />
                Image link
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("p-0", fillViewport && "flex min-h-0 flex-1 flex-col")}>
        {hideHeader && !persistToBrowserStorage ? (
          <p className="border-b border-border/40 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Sign in to save this notebook in your browser.
          </p>
        ) : null}
        {saveError ? (
          <div
            className="border-b border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive"
            role="alert"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{saveError}</span>
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-destructive underline hover:bg-destructive/10"
                onClick={() => setSaveError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {saveWarning && !saveError ? (
          <div
            className="border-b border-amber-300/50 bg-amber-50/90 px-4 py-2 text-sm text-amber-950"
            role="status"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{saveWarning}</span>
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-amber-900 underline hover:bg-amber-100/80"
                onClick={() => setSaveWarning(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "overflow-y-auto bg-white/50",
            fillViewport
              ? "min-h-0 flex-1 border-b border-border/30"
              : "min-h-[12rem] max-h-[min(50vh,28rem)] border-y border-border/30"
          )}
          style={fillViewport ? undefined : { resize: "vertical" as const }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "cursor-text px-4 py-3 text-sm leading-relaxed text-foreground outline-none [word-break:break-word]",
              EDITOR_IMAGE_RESPONSIVE,
              fillViewport ? "min-h-[calc(100dvh-16rem)]" : "min-h-[12rem]",
              loaded && "focus:ring-0"
            )}
            onInput={onEditorInput}
            onBlur={persistNow}
            onClick={onEditorClick}
            onMouseUp={onEditorMouseUp}
            onPaste={onPaste}
            {...(hideHeader
              ? { "aria-label": "My notebook" as const }
              : { "aria-labelledby": titleId })}
          />
        </div>
        {hideHeader ? (
          <p
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/30 px-4 py-2 text-[10px] text-muted-foreground",
              fillViewport && "shrink-0"
            )}
          >
            <span>
              <StickyNote className="mb-0.5 mr-1 inline h-3 w-3 align-text-bottom" />
              Paste images or one http(s) link for a card that opens in a new tab. × removes images. Drag the corner; click the image to zoom.
            </span>
            {structuredEditHref ? (
              <Link className="font-medium text-foreground/80 underline offset-2 hover:text-foreground" href={structuredEditHref}>
                Form (API)
              </Link>
            ) : null}
            <button
              type="button"
              className="font-medium text-foreground/80 underline offset-2 hover:text-foreground"
              onClick={addImageUrl}
            >
              Image
            </button>
            <button
              type="button"
              className="font-medium text-foreground/80 underline offset-2 hover:text-foreground"
              onClick={addWebLink}
            >
              Web link
            </button>
          </p>
        ) : (
          <p className="border-t border-border/30 px-4 py-2 text-[10px] text-muted-foreground">
            <StickyNote className="mb-0.5 mr-1 inline h-3 w-3 align-text-bottom" />
            × removes an image. Paste a single http(s) link for an open-in-new-tab card. Buttons above.
          </p>
        )}
      </CardContent>
      {lightboxSrc && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
              onClick={() => setLightboxSrc(null)}
              onKeyDown={(e) => e.key === "Escape" && setLightboxSrc(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSrc(null);
                }}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
              {/* user-provided or pasted image; src is blob/data from the note */}
              <img
                src={lightboxSrc}
                alt=""
                className="max-h-[min(90dvh,1200px)] w-auto max-w-[min(100vw,1200px)] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </Card>
  );
}
