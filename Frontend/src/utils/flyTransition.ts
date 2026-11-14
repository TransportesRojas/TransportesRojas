// Transiciones FLIP para catálogos

export type FlySource = "grid" | "sidebar";

export interface FlySnapshot {
  source: FlySource;
  selectedId: string | null;
  rects: Map<string, DOMRect>;
  createdAt: number;
}

const MAX_AGE_MS = 2500;
let pending: FlySnapshot | null = null;

export function captureFlyRects(
  root: ParentNode,
  source: FlySource,
  selectedId: string | null = null,
): void {
  const rects = new Map<string, DOMRect>();
  root.querySelectorAll<HTMLElement>("[data-fly-id]").forEach((el) => {
    const id = el.dataset.flyId;
    if (id) {
      rects.set(id, el.getBoundingClientRect());
    }
  });
  pending = { source, selectedId, rects, createdAt: performance.now() };
}

export function peekFlyRects(expected: FlySource): FlySnapshot | null {
  const snap = pending;
  if (!snap || snap.source !== expected) return null;
  if (performance.now() - snap.createdAt > MAX_AGE_MS) return null;
  return snap;
}

export function clearFlyRects(): void {
  pending = null;
}

export interface FlyOptions {
  floatingClass?: string;
  entrance?: "left" | "up";
  onStart?: () => void;
  onPrimaryTouchdown?: () => void;
  onDone?: () => void;
}

// Animación principal

export function playFlyAnimation(
  elements: Map<string, HTMLElement>,
  snap: FlySnapshot | null,
  { floatingClass, entrance = "left", onStart, onPrimaryTouchdown, onDone }: FlyOptions = {},
): () => void {
  if (elements.size === 0) {
    onPrimaryTouchdown?.();
    onDone?.();
    return () => {};
  }

  const entries = [...elements.entries()];
  onStart?.();

  const isFromGrid = snap?.source === "grid";
  const duration = 540;
  const stagger = 20;
  const easingCurve = "cubic-bezier(0.16, 1, 0.3, 1)";
  const animations: Animation[] = [];

  entries.forEach(([id, el], index) => {
    const first = snap?.rects.get(id);
    let animation: Animation;

    if (first) {
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;

      if (floatingClass) el.classList.add(floatingClass);

      const startRadius = isFromGrid ? "16px" : "9px";
      const endRadius = isFromGrid ? "9px" : "16px";
      const startPadding = isFromGrid ? "20px 22px" : "9px 11px";
      const endPadding = isFromGrid ? "9px 11px" : "20px 22px";

      animation = el.animate(
        [
          {
            transform: `translate3d(${dx}px, ${dy}px, 0)`,
            width: `${first.width}px`,
            height: `${first.height}px`,
            borderRadius: startRadius,
            padding: startPadding,
            boxShadow: isFromGrid
              ? "0 14px 32px rgba(11, 45, 74, 0.16), 0 4px 10px rgba(0, 0, 0, 0.06)"
              : "0 4px 12px rgba(11, 45, 74, 0.08)",
            zIndex: "9999",
            offset: 0,
          },
          {
            transform: "translate3d(0px, 0px, 0)",
            width: `${last.width}px`,
            height: `${last.height}px`,
            borderRadius: endRadius,
            padding: endPadding,
            boxShadow: isFromGrid
              ? "0 1px 3px rgba(0, 0, 0, 0.04)"
              : "0 10px 24px rgba(11, 45, 74, 0.12)",
            zIndex: "1",
            offset: 1,
          },
        ],
        {
          duration,
          delay: index * stagger,
          easing: easingCurve,
          fill: "backwards",
        },
      );

      // Transición interna de tarjeta hacia elemento lateral
      if (isFromGrid) {
        const iconWrap = el.querySelector<HTMLElement>(".admin-sidebar-item-icon-wrap");
        const content = el.querySelector<HTMLElement>(".admin-sidebar-item-content");
        const nameEl = el.querySelector<HTMLElement>(".admin-sidebar-item-name");
        const descEl = el.querySelector<HTMLElement>(".admin-sidebar-item-desc");
        const arrow = el.querySelector<HTMLElement>(".admin-sidebar-item-arrow");

        if (iconWrap) {
          iconWrap.animate(
            [
              {
                transform: "translate3d(6px, 8px, 0) scale(1.24)",
                borderRadius: "12px",
                offset: 0,
              },
              {
                transform: "translate3d(0px, 0px, 0) scale(1)",
                borderRadius: "8px",
                offset: 1,
              },
            ],
            {
              duration,
              delay: index * stagger,
              easing: easingCurve,
              fill: "backwards",
            },
          );
        }

        if (content) {
          content.animate(
            [
              {
                transform: "translate3d(-30px, 46px, 0)",
                transformOrigin: "top left",
                offset: 0,
              },
              {
                transform: "translate3d(0px, 0px, 0)",
                transformOrigin: "top left",
                offset: 1,
              },
            ],
            {
              duration,
              delay: index * stagger,
              easing: easingCurve,
              fill: "backwards",
            },
          );
        }

        if (nameEl) {
          nameEl.animate(
            [
              {
                fontSize: "1.12rem",
                marginBottom: "4px",
                offset: 0,
              },
              {
                fontSize: "0.86rem",
                marginBottom: "0px",
                offset: 1,
              },
            ],
            {
              duration,
              delay: index * stagger,
              easing: easingCurve,
              fill: "backwards",
            },
          );
        }

        if (descEl) {
          descEl.animate(
            [
              {
                fontSize: "0.84rem",
                opacity: 0.85,
                offset: 0,
              },
              {
                fontSize: "0.70rem",
                opacity: 0.70,
                offset: 1,
              },
            ],
            {
              duration,
              delay: index * stagger,
              easing: easingCurve,
              fill: "backwards",
            },
          );
        }

        if (arrow) {
          arrow.animate(
            [
              { opacity: 0, transform: "translate3d(-8px, 0, 0)", offset: 0 },
              { opacity: 0, offset: 0.65 },
              { opacity: 1, transform: "translate3d(0, 0, 0)", offset: 1 },
            ],
            {
              duration,
              delay: index * stagger,
              easing: easingCurve,
              fill: "backwards",
            },
          );
        }
      }

      const cleanup = () => {
        if (floatingClass) el.classList.remove(floatingClass);
      };
      animation.addEventListener("finish", cleanup);
      animation.addEventListener("cancel", cleanup);
      animations.push(animation);
    } else {
      const from = entrance === "left" ? "translate3d(-12px, 0, 0)" : "translate3d(0, 10px, 0)";
      animation = el.animate(
        [
          { transform: from, opacity: 0 },
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
        ],
        {
          duration: 260,
          delay: index * 16,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        },
      );
      animations.push(animation);
    }
  });

  let cancelled = false;

  const touchdownTimer = setTimeout(() => {
    if (!cancelled) {
      onPrimaryTouchdown?.();
    }
  }, 440);

  Promise.all(animations.map((a) => a.finished))
    .then(() => {
      if (!cancelled) {
        onPrimaryTouchdown?.();
        onDone?.();
      }
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    clearTimeout(touchdownTimer);
    animations.forEach((a) => a.cancel());
  };
}
