"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroImage } from "@/lib/hero-images";

/** How long a photo stays fully visible after its fade-in, in ms. */
export const HOLD_MS = 3000;
/** Crossfade length in ms — also drives the CSS transition, so one slide every FADE_MS + HOLD_MS. */
export const FADE_MS = 1200;
/** Total delay from the last manual input (click, swipe, arrow key) to the next automatic advance, in ms. */
export const RESUME_MS = 4000;

// With prefers-reduced-motion: no autoplay, and slides swap with a short fade.
const REDUCED_FADE_MS = 150;
// Must be listed in images.qualities (next.config.ts), or Next silently snaps it to 75.
const QUALITY = 88;
// Portrait photos cover a portrait viewport by HEIGHT: once the viewport is
// narrower than 4:5 the photo is ~80vh wide, more than 100vw. Otherwise it
// covers by width.
const SIZES = "(max-aspect-ratio: 4/5) 80vh, 100vw";
const SWIPE_MIN_PX = 50;
// Autoplay pauses once less than this share of the hero is on screen.
const IN_VIEW_THRESHOLD = 0.35;
// A photo a navigation has waited this long for is passed over for now (it
// keeps loading and rejoins once it arrives), so one request that never
// completes can't freeze the carousel.
const STALL_MS = 8000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

type Direction = 1 | -1;

type View = {
  active: number;
  // Most recent first. Every photo in the stack stays opaque (active on top),
  // so a crossfade — even one interrupted by a quick second click — never dips
  // through to the page background.
  stack: readonly number[];
  // Every photo ever shown stays mounted, so returning to it is instant.
  seen: ReadonlySet<number>;
};

type NavRequest = { target: number; dir: Direction; manual: boolean };

type PlayPref = "auto" | "paused" | "playing";

/**
 * Homepage hero: a full-bleed photo carousel that renders the hero <section>
 * itself, with the scrim and centred content passed in as `children`.
 *
 * - Loading: only the first photo is in the initial HTML (eager, high
 *   priority). Neighbours are mounted once the current photo has loaded — the
 *   next one straight away, the previous one on the first sign of interaction.
 * - Never an empty frame: a navigation waits until its target has loaded and
 *   decoded; a photo that errors is unmounted and skipped in both directions,
 *   and one still loading after STALL_MS is skipped until it arrives.
 * - Autoplay pauses on hover over the controls, keyboard focus inside the
 *   hero, a hidden tab, the hero scrolled out of view, and the pause button;
 *   after manual input it resumes RESUME_MS after that input.
 */
export function HeroCarousel({
  images,
  className,
  children,
}: {
  images: readonly HeroImage[];
  className?: string;
  children: ReactNode;
}) {
  const count = images.length;

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // Server render: assume no autoplay. The first photo is all the HTML
    // carries either way, so this only delays autoplay until hydration.
    () => true
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false
  );

  const [view, setView] = useState<View>(() => ({ active: 0, stack: [0], seen: new Set([0]) }));
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  // Still loading after STALL_MS: skipped by navigation but kept mounted.
  const [stalled, setStalled] = useState<ReadonlySet<number>>(() => new Set());
  const [request, setRequest] = useState<NavRequest | null>(null);
  const [playPref, setPlayPref] = useState<PlayPref>("auto");
  const [hoverControls, setHoverControls] = useState(false);
  const [keyboardFocusWithin, setKeyboardFocusWithin] = useState(false);
  const [inView, setInView] = useState(true);
  const [interacted, setInteracted] = useState(false);
  // Set by manual input, cleared by the next automatic advance.
  const [lastManualAt, setLastManualAt] = useState<number | null>(null);
  // The live region only speaks after a manual change, never during autoplay.
  const [announce, setAnnounce] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const shownAt = useRef(0);
  const resumedAt = useRef(0);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);

  const { active } = view;
  const fadeMs = reducedMotion ? REDUCED_FADE_MS : FADE_MS;
  const isPlaying = playPref === "playing" || (playPref === "auto" && !reducedMotion);
  const autoplay =
    isPlaying && count > 1 && !hoverControls && !keyboardFocusWithin && !hidden && inView;

  const skipped = (i: number) => failed.has(i) || stalled.has(i);

  // Nearest photo in `dir` that hasn't failed or stalled, wrapping around.
  const step = (from: number, dir: Direction) => {
    for (let k = 1; k < count; k++) {
      const i = (((from + dir * k) % count) + count) % count;
      if (!skipped(i)) return i;
    }
    return from;
  };

  // A requested photo that failed or stalled meanwhile is passed over in the
  // same direction.
  let target: number | null = null;
  if (request) {
    target = skipped(request.target) ? step(request.target, request.dir) : request.target;
    if (target === active) target = null;
  }

  const settled = (i: number) => loaded.has(i) || failed.has(i);
  const mounted = new Set([...view.seen, ...stalled]);
  if (target !== null) mounted.add(target);
  if (count > 1 && settled(active)) {
    mounted.add(step(active, 1));
    if (interacted || active !== 0) mounted.add(step(active, -1));
  }
  for (const i of failed) mounted.delete(i);

  const shown = images.map((_, i) => i).filter((i) => !failed.has(i));
  const position = shown.indexOf(active) + 1;

  function go(dir: Direction, manual: boolean) {
    if (count < 2) return;
    if (manual) {
      setLastManualAt(performance.now());
      setInteracted(true);
      setAnnounce(true);
    }
    const next = step(target ?? active, dir);
    setRequest(next === active ? null : { target: next, dir, manual });
  }

  // Commit a navigation only once its photo is loaded AND decoded, so the fade
  // starts on a fully painted frame. Autoplay requests wait while paused.
  useEffect(() => {
    if (target === null || !loaded.has(target)) return;
    if (!request?.manual && !autoplay) return;
    const manual = request?.manual ?? false;
    let cancelled = false;
    const img = imgRefs.current[target];
    (img ? img.decode() : Promise.resolve())
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        shownAt.current = performance.now();
        setView((v) => ({
          active: target,
          stack: [target, ...v.stack.filter((i) => i !== target)].slice(0, 3),
          seen: new Set(v.seen).add(target),
        }));
        setRequest(null);
        if (!manual) {
          setLastManualAt(null);
          setAnnounce(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [target, loaded, request, autoplay]);

  useEffect(() => {
    if (target === null || loaded.has(target)) return;
    const timer = window.setTimeout(() => {
      setStalled((prev) => new Set(prev).add(target));
    }, STALL_MS);
    return () => window.clearTimeout(timer);
  }, [target, loaded]);

  useEffect(() => {
    if (autoplay) resumedAt.current = performance.now();
  }, [autoplay]);

  const advance = useEffectEvent(() => go(1, false));

  useEffect(() => {
    if (!autoplay || target !== null) return;
    // After manual input: RESUME_MS after that input, in total. Otherwise the
    // normal cadence. Either way, never sooner than a full hold after a pause.
    const due =
      lastManualAt !== null ? lastManualAt + RESUME_MS : shownAt.current + fadeMs + HOLD_MS;
    const at = Math.max(due, resumedAt.current + HOLD_MS);
    const timer = window.setTimeout(advance, Math.max(0, at - performance.now()));
    return () => window.clearTimeout(timer);
  }, [autoplay, target, active, lastManualAt, fadeMs]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.intersectionRatio >= IN_VIEW_THRESHOLD),
      { threshold: [0, IN_VIEW_THRESHOLD, 1] }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const onArrowKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!inView) return;
    // Leave arrows alone wherever they already mean something: text fields,
    // and any open dialog (search overlay, menu sheet).
    const el = event.target instanceof Element ? event.target : null;
    if (el?.closest("input, textarea, select, [contenteditable], [role='dialog']")) return;
    event.preventDefault();
    go(event.key === "ArrowRight" ? 1 : -1, true);
  });

  useEffect(() => {
    window.addEventListener("keydown", onArrowKey);
    return () => window.removeEventListener("keydown", onArrowKey);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") return;
    setInteracted(true);
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) {
      go(dx < 0 ? 1 : -1, true);
    }
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    setInteracted(true);
    // Only keyboard focus pauses: a mouse click on a control also focuses it,
    // and that must not pin the carousel paused.
    if (event.target.matches(":focus-visible")) setKeyboardFocusWithin(true);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setKeyboardFocusWithin(false);
    }
  }

  if (count === 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Foto editoriali"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn("relative isolate touch-pan-y overflow-hidden", className)}
    >
      <div className="absolute inset-0 isolate">
        {images.map((image, i) => {
          if (!mounted.has(i)) return null;
          const depth = view.stack.indexOf(i);
          const isActive = i === active;
          return (
            <div
              key={image.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`Foto ${shown.indexOf(i) + 1} di ${shown.length}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{
                opacity: depth === -1 ? 0 : 1,
                zIndex: depth === -1 ? 0 : 3 - depth,
                transitionDuration: `${fadeMs}ms`,
              }}
            >
              <Image
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={image.src}
                alt=""
                fill
                sizes={SIZES}
                quality={QUALITY}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                onLoad={() => {
                  setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
                  setStalled((prev) => {
                    if (!prev.has(i)) return prev;
                    const next = new Set(prev);
                    next.delete(i);
                    return next;
                  });
                }}
                onError={() => setFailed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))}
                style={
                  {
                    "--hero-pos": image.position ?? "50% 50%",
                    "--hero-pos-landscape": image.landscapePosition ?? image.position ?? "50% 50%",
                  } as CSSProperties
                }
                className="object-cover object-[var(--hero-pos)] landscape:object-[var(--hero-pos-landscape)]"
              />
            </div>
          );
        })}
      </div>

      {children}

      {shown.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-0 z-[5] flex items-center justify-between px-2 pb-2 sm:px-4 sm:pb-4"
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return;
            setHoverControls(true);
            setInteracted(true);
          }}
          onPointerLeave={() => setHoverControls(false)}
        >
          <p aria-hidden className="pl-2 text-xs tracking-[0.15em] text-foreground tabular-nums">
            {pad(position)} / {pad(shown.length)}
          </p>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Foto precedente"
              onClick={() => go(-1, true)}
            >
              <CaretLeftIcon className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={isPlaying ? "Metti in pausa" : "Riproduci"}
              onClick={() => {
                setInteracted(true);
                setPlayPref(isPlaying ? "paused" : "playing");
              }}
            >
              {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Foto successiva"
              onClick={() => go(1, true)}
            >
              <CaretRightIcon className="size-5" />
            </Button>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live={announce ? "polite" : "off"} aria-atomic="true">
        Foto {position} di {shown.length}
      </p>
    </section>
  );
}
