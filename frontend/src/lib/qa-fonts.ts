import { Baloo_2, Comic_Neue, Fredoka, Nunito, Quicksand, Varela_Round } from "next/font/google";

/** Per-font subsets (next/font only allows subsets each family actually publishes). */

export const fontVarelaRound = Varela_Round({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-varela-round",
  display: "swap"
});

export const fontQuicksand = Quicksand({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap"
});

export const fontNunito = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-nunito",
  display: "swap"
});

export const fontFredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap"
});

export const fontComicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-comic-neue",
  display: "swap"
});

export const fontBaloo2 = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-baloo-2",
  display: "swap"
});

/**
 * Loads Appearance-menu families via next/font (embedded at build).
 * Apply the returned classNames on `<html>` so :root/--app-font + html[data-font] see --font-* vars.
 */
export const qaQuestFontVariableClasses = [
  fontVarelaRound.variable,
  fontQuicksand.variable,
  fontNunito.variable,
  fontFredoka.variable,
  fontComicNeue.variable,
  fontBaloo2.variable
].join(" ");
