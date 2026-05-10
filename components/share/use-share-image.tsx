"use client";

import * as React from "react";
import { ShareCard, SHARE_CARD_DIMENSIONS, type ShareCardProps } from "./share-card";

/* -----------------------------------------------------------------------------
   useShareImage — render-and-capture for the 1080x1350 ShareCard.

   Strategy
   --------
   1. Mount a fresh React tree (createRoot) into a fixed-position offscreen
      host pinned at top:-10000px so layout/paint runs but the user never sees
      it.
   2. ShareCard fires `onReady` from a useLayoutEffect after first commit.
   3. After ready: force-load each font weight/family used in the card via
      document.fonts.load(), then await document.fonts.ready. This is belt-
      and-braces — fonts.ready alone occasionally resolves before all weights
      are available in headless-style render contexts.
   4. Walk every <img> in the host and await `img.decode()` so html-to-image
      sees decoded bitmaps. Failed decodes are tolerated; ShareCard's avatar
      fallback (the package's initials) takes over.
   5. html-to-image.toBlob with width/height/pixelRatio:1 and cacheBust:false.
   6. Memoize the in-flight Promise<Blob> so back-to-back Save+Share triggers
      one capture, not two.
   ----------------------------------------------------------------------------- */

type CardInputs = Omit<ShareCardProps, "onReady">;

type CaptureState = "idle" | "rendering" | "ready" | "error";

const FONT_WEIGHTS_TO_PRELOAD: Array<{ weight: string; family: string }> = [
  { weight: "400", family: "var(--font-display)" },
  { weight: "400", family: "var(--font-condensed)" },
  { weight: "500", family: "var(--font-condensed)" },
  { weight: "700", family: "var(--font-condensed)" },
  { weight: "800", family: "var(--font-condensed)" },
  { weight: "400", family: "var(--font-sans)" },
  { weight: "500", family: "var(--font-sans)" },
  { weight: "600", family: "var(--font-sans)" },
  { weight: "700", family: "var(--font-sans)" },
  { weight: "400", family: "var(--font-mono)" },
  { weight: "700", family: "var(--font-mono)" },
];

async function preloadFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(
    FONT_WEIGHTS_TO_PRELOAD.map(({ weight, family }) =>
      // The browser deduplicates identical load() calls; failures (e.g. font
      // not yet wired into next/font) are non-fatal — the export falls back
      // to the next family in the stack.
      document.fonts.load(`${weight} 16px ${family}`).catch(() => undefined),
    ),
  );
  await document.fonts.ready;
}

async function decodeImagesIn(host: HTMLElement): Promise<void> {
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (!img.complete) {
          await new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
          });
        }
        await img.decode().catch(() => undefined);
      } catch {
        // Decode failures fall back to the soccer-pitch package's initials
        // treatment (avatar drops the photo, shows last-name initials).
      }
    }),
  );
}

function captureBlob(host: HTMLElement, inputs: CardInputs): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let resolved = false;

    void (async () => {
      const { createRoot } = await import("react-dom/client");
      const { toBlob } = await import("html-to-image");

      const root = createRoot(host);

      const cleanup = () => {
        // Defer unmount to the next task so html-to-image's clone isn't
        // racing with React's commit phase.
        setTimeout(() => {
          try {
            root.unmount();
          } catch {
            // ignore
          }
          host.remove();
        }, 0);
      };

      const handleReady = async () => {
        if (resolved) return;
        try {
          await preloadFonts();
          await decodeImagesIn((host.firstElementChild as HTMLElement) ?? host);
          // Two rAFs guarantee at least one full paint cycle — enough for any
          // remaining framer-motion projection work to settle.
          await new Promise<void>((res) => requestAnimationFrame(() => res()));
          await new Promise<void>((res) => requestAnimationFrame(() => res()));

          // Capture the ShareCard root (firstElementChild), NOT the host
          // container. The host has position:fixed;top:-10000px — inside the
          // SVG foreignObject used by html-to-image, fixed positioning is
          // relative to the foreignObject viewport, so top:-10000px clips all
          // content and produces a blank white image.
          const captureTarget = (host.firstElementChild as HTMLElement) ?? host;
          const blob = await toBlob(captureTarget, {
            width: SHARE_CARD_DIMENSIONS.width,
            height: SHARE_CARD_DIMENSIONS.height,
            pixelRatio: 1,
            cacheBust: false,
          });
          if (!blob) throw new Error("toBlob returned null");
          resolved = true;
          resolve(blob);
        } catch (err) {
          resolved = true;
          reject(err);
        } finally {
          cleanup();
        }
      };

      root.render(<ShareCard {...inputs} onReady={handleReady} />);
    })().catch((err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

function makeOffscreenHost(): HTMLElement {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.top = "-10000px";
  host.style.left = "0";
  host.style.width = `${SHARE_CARD_DIMENSIONS.width}px`;
  host.style.height = `${SHARE_CARD_DIMENSIONS.height}px`;
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  // Inherit the document's font-family CSS variables.
  host.style.fontFamily = "var(--font-sans), system-ui, sans-serif";
  document.body.appendChild(host);
  return host;
}

export function slugifyCountry(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function shareImageFilename(teamName: string): string {
  return `${slugifyCountry(teamName)}_startingxi2026_lineup.png`;
}

export function useShareImage(inputs: CardInputs) {
  const [state, setState] = React.useState<CaptureState>("idle");
  const inFlightRef = React.useRef<Promise<Blob> | null>(null);
  // Bump on input change to invalidate cached blobs.
  const inputsKey = React.useMemo(() => {
    const sIds = inputs.starters.map((p) => p.id).join(",");
    const bIds = inputs.bench.map((p) => p.id).join(",");
    return `${inputs.team.name}|${inputs.formation.name}|${sIds}|${bIds}|${inputs.category?.badge ?? ""}`;
  }, [inputs.team.name, inputs.formation.name, inputs.starters, inputs.bench, inputs.category]);
  const cachedKeyRef = React.useRef<string>("");

  const ensureBlob = React.useCallback((): Promise<Blob> => {
    if (cachedKeyRef.current !== inputsKey) {
      inFlightRef.current = null;
      cachedKeyRef.current = inputsKey;
    }
    if (inFlightRef.current) return inFlightRef.current;

    setState("rendering");
    const host = makeOffscreenHost();
    const promise = captureBlob(host, inputs)
      .then((blob) => {
        setState("ready");
        return blob;
      })
      .catch((err) => {
        // On error, drop the cached promise so the next click can retry.
        inFlightRef.current = null;
        setState("error");
        throw err;
      });
    inFlightRef.current = promise;
    return promise;
  }, [inputs, inputsKey]);

  return { state, ensureBlob };
}
