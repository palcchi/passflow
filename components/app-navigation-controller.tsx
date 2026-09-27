"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type ViewTransitionHandle = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>,
  ) => ViewTransitionHandle;
};

function getInternalUrl(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function shouldSkip(anchor: HTMLAnchorElement, event?: MouseEvent) {
  if (anchor.hasAttribute("download")) return true;
  if (anchor.dataset.noTransition === "true") return true;
  if (anchor.target && anchor.target !== "_self") return true;
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return true;
  return false;
}

export function AppNavigationController() {
  const router = useRouter();
  const pathname = usePathname();
  const resolveNavigationRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    resolveNavigationRef.current?.();
    resolveNavigationRef.current = null;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    document.documentElement.removeAttribute("data-nav-pending");
  }, [pathname]);

  useEffect(() => {
    const prefetch = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || shouldSkip(anchor)) return;

      const url = getInternalUrl(anchor);
      if (!url) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      router.prefetch(`${url.pathname}${url.search}`);
    };

    const onPointerIntent = (event: Event) => prefetch(event.target);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;

      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || shouldSkip(anchor, event)) return;

      const url = getInternalUrl(anchor);
      if (!url) return;

      const samePage =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;

      if (samePage || (samePage && url.hash)) return;

      event.preventDefault();

      const destination = `${url.pathname}${url.search}${url.hash}`;
      document.documentElement.setAttribute("data-nav-pending", "true");

      const navigate = () =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };

          resolveNavigationRef.current = finish;
          timeoutRef.current = window.setTimeout(finish, 1400);
          router.push(destination);
        });

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const doc = document as ViewTransitionDocument;

      if (!prefersReducedMotion && doc.startViewTransition) {
        doc.startViewTransition(navigate);
      } else {
        void navigate();
      }
    };

    document.addEventListener("pointerover", onPointerIntent, { passive: true });
    document.addEventListener("focusin", onPointerIntent);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointerover", onPointerIntent);
      document.removeEventListener("focusin", onPointerIntent);
      document.removeEventListener("click", onClick, true);
    };
  }, [router]);

  return null;
}
