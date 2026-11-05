/**
 * Curved-monitor rail: cards wrap around the viewer on the inside of a
 * cylinder. HTML can't bend, so each card is drawn as several identical copies,
 * each clipped to one vertical strip and placed — facing the viewer — at that
 * strip's own point on the cylinder. Side by side the strips form one smoothly
 * curved card. With CSS `perspective` equal to the radius, the front of the
 * curve sits on the screen plane and the edges swing toward you.
 */
export interface RailCard {
  /** Index into the card list (projects, then "More projects"). */
  index: number;
  slices: HTMLElement[];
  width: number;
  /** Arc-length position of the card's centre along the rail, in px. */
  center: number;
}

/** Beyond this angle a strip is behind the viewer's shoulder: fully faded. */
const MAX_ANGLE = 1.25;
/** Strips start fading out past this angle (radians). */
const FADE_FROM = 0.85;
/** Only strips this close to the front can be clicked. */
const INTERACTIVE_ANGLE = 0.6;
/** Strips overlap by this much so no hairline seams show between them. */
const SEAM_OVERLAP = 0.75;

/**
 * Measures each card (all its slices share one size), spaces cards along the
 * rail with `gap`, and sets each slice's static clip strip and pivot.
 */
export function layoutRail(cardSlices: HTMLElement[][], gap: number): RailCard[] {
  let cursor = 0;
  return cardSlices.map((slices, index) => {
    const width = slices[0]?.offsetWidth ?? 0;
    const strip = width / Math.max(1, slices.length);
    slices.forEach((slice, i) => {
      const left = Math.max(0, i * strip - SEAM_OVERLAP);
      const right = Math.max(0, width - (i + 1) * strip - SEAM_OVERLAP);
      slice.style.clipPath = `inset(0 ${right.toFixed(2)}px 0 ${left.toFixed(2)}px)`;
      // Pivot about the strip's own centre so it turns in place on the curve.
      slice.style.transformOrigin = `${((i + 0.5) * strip).toFixed(2)}px 50%`;
    });
    const card = { index, slices, width, center: cursor + width / 2 };
    cursor += width + gap;
    return card;
  });
}

/**
 * Places every strip for a rail scrolled by `offset` px (0 = first card
 * centred) and returns the index of the card nearest the front.
 * `interactive` must stay false while the rail is hidden: a child with
 * `pointer-events: auto` receives clicks even inside a `pointer-events: none` parent.
 */
export function placeRail(cards: RailCard[], offset: number, radius: number, interactive: boolean): number {
  const first = cards[0]?.center ?? 0;
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const card of cards) {
    const distance = Math.abs(card.center - first - offset);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = card.index;
    }
    const strip = card.width / Math.max(1, card.slices.length);
    card.slices.forEach((slice, i) => {
      // Where this strip's centre sits relative to the card's centre.
      const local = -card.width / 2 + (i + 0.5) * strip;
      const angle = (card.center + local - first - offset) / radius;
      const abs = Math.abs(angle);
      // Far strips are parked at the edge angle (never behind the camera).
      const placed = Math.sign(angle) * Math.min(abs, MAX_ANGLE);
      const x = radius * Math.sin(placed) - local;
      const z = radius * (1 - Math.cos(placed));
      const style = slice.style;
      style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${(-placed).toFixed(4)}rad)`;
      style.opacity = abs <= FADE_FROM ? "1" : Math.max(0, 1 - (abs - FADE_FROM) / (MAX_ANGLE - FADE_FROM)).toFixed(3);
      style.pointerEvents = interactive && abs < INTERACTIVE_ANGLE ? "auto" : "none";
    });
  }
  return nearest;
}

/** Removes the inline styles layout/place wrote (when leaving the immersive layout). */
export function clearRail(cards: RailCard[]): void {
  for (const card of cards) {
    for (const slice of card.slices) {
      for (const prop of ["transform", "opacity", "pointer-events", "clip-path", "transform-origin"]) {
        slice.style.removeProperty(prop);
      }
    }
  }
}
