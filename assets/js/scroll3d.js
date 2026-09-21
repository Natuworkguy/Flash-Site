// Scroll-driven 3D transforms.
//
// Every participating element gets two custom properties updated as it moves
// through the viewport, and the stylesheet decides what to do with them:
//
//   --enter  0 -> 1 as the element rises into view, eased, and held at 1
//            once it has arrived. Drives entrance transforms.
//   --p      0 -> 1 across the element's entire travel through the viewport,
//            never held. Drives continuous parallax.
//
// Keeping the maths here and the motion in CSS means a preset is a handful of
// custom properties rather than another branch in a render loop.
//
// Which elements animate is listed in GROUPS below rather than marked up in
// the partials, so the whole choreography can be read, reordered or switched
// off in one place.

/** Fraction of the viewport an element travels through before it has fully
 *  arrived. Larger = slower, longer entrances. */
const ENTER_SPAN = 0.45;

/** Pixels of scroll each successive element in a staggered group waits before
 *  starting, so rows and grids resolve one after another instead of together. */
const STAGGER_PX = 45;

/** Stagger positions cycle rather than accumulating down a group. A group of
 *  nine cards that simply counted up would leave the last one waiting eight
 *  steps, so it would still be arriving as it left the top of the screen.
 *  Cycling keeps every element's delay bounded while preserving the sense of
 *  a wave running across a grid. */
const STAGGER_CYCLE = 4;

/** Start elements slightly on their way in, so content near the top of the
 *  page on first paint is not sitting at full rotation. */
const PRIMER = 0.08;

// The page uses three presets. Earlier there were eleven, and a grid of cards
// that flipped alternately from left and right while the row above swung and
// the one below dropped read as busy rather than considered. Uniform motion
// lets the content be the thing that changes between sections.
//
// preset      the CSS preset in style.css that reads --enter / --p
// stagger     true to offset successive matches, or a number to set the cycle
// alternate   flip the preset left/right for every other match
// persp       per-group perspective override, in px
const GROUPS = [
  { sel: ".hero-badge", preset: "pop" },
  { sel: ".hero-title", preset: "rise" },
  { sel: ".hero-sub", preset: "rise" },
  { sel: ".hero-install", preset: "rise" },
  { sel: ".hero-cta", preset: "rise" },
  { sel: ".hero-trust", preset: "rise-sm" },

  { sel: ".compare-kicker", preset: "rise-sm" },
  { sel: ".vs-table", preset: "rise", persp: 1400 },
  { sel: ".vs-aside", preset: "rise" },
  { sel: ".vs-foot", preset: "rise-sm" },

  { sel: ".watch-kicker, .watch-title, .watch-sub", preset: "rise", stagger: true },
  { sel: ".video-embed", preset: "rise", persp: 1400 },

  { sel: ".power-kicker, .power-title, .power-sub", preset: "rise", stagger: true },
  { sel: ".cloud-note", preset: "rise" },
  { sel: ".host-toggle", preset: "rise" },
  { sel: ".host-card", preset: "rise" },
  { sel: ".trust-note, .config-note, .onyx-note", preset: "rise", stagger: true },

  { sel: ".claim-visual", preset: "rise", persp: 1000 },
  { sel: ".claim-text", preset: "rise", persp: 1000 },

  { sel: ".section-title", preset: "rise" },
  { sel: ".section-sub", preset: "rise" },

  // The nine feature cards are the centrepiece: they alternate which edge
  // they hinge on and resolve in sequence, so the grid assembles itself.
  { sel: ".feature-card", preset: "rise", stagger: true, persp: 1100 },

  { sel: ".feature-icon", preset: "pop", stagger: true },

  { sel: ".onyx-kicker, .onyx-title, .onyx-sub, .onyx-subhead", preset: "rise", stagger: true },
  { sel: ".onyx-specs li", preset: "rise-sm", stagger: true },
  { sel: ".onyx-new li", preset: "rise-sm", stagger: true },
  // .onyx-visual carries the entrance; the mark inside it keeps its own
  // scroll-linked float via [data-scrub], so giving the wrapper a preset too
  // would put two rules on the same transform.
  { sel: ".onyx-visual", preset: "rise", persp: 1300 },
  // .aura-field is deliberately absent: it centres itself with a transform
  // and is already scroll-driven through [data-scrub], so a preset here would
  // overwrite the centring and knock it out of position.
  { sel: ".onyx-compare .compare-row", preset: "rise-sm", stagger: true },
  { sel: ".onyx-devlog, .onyx-claim", preset: "rise", stagger: true },

  { sel: ".tabs", preset: "rise" },
  { sel: ".code-block", preset: "rise", stagger: true, persp: 1100 },
  { sel: ".live-config", preset: "rise" },

  { sel: ".usage-card", preset: "rise", stagger: true, persp: 1200 },
  { sel: ".usage-index", preset: "pop" },
  { sel: ".cmd-table tbody tr", preset: "rise-sm", stagger: 5, persp: 900 },
  { sel: ".usage-card .mini-term", preset: "rise" },

  { sel: ".marquee", preset: "rise-sm" },

  { sel: ".faq-list", preset: "rise", persp: 1400 },

  { sel: ".final-title", preset: "rise", persp: 1500 },
  { sel: ".final-install", preset: "rise" },
  { sel: ".final-sub", preset: "rise" },
  { sel: ".final-cta .hero-cta", preset: "rise" },

  { sel: ".footer-inner", preset: "rise" },
  { sel: ".footer-links a", preset: "pop", stagger: true },
  { sel: ".footer-fine", preset: "rise" },
];

function easeOutCubic(t) {
  const u = 1 - t;
  return 1 - u * u * u;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function initScroll3D() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** @type {HTMLElement[]} */
  const items = [];
  const seen = new Set();

  for (const group of GROUPS) {
    const matches = document.querySelectorAll(group.sel);
    matches.forEach((el, i) => {
      // An element listed twice would have its transform fought over by two
      // presets; first listing wins.
      if (seen.has(el)) return;
      seen.add(el);

      const preset = group.alternate && i % 2 === 1 ? group.alternate : group.preset;
      el.setAttribute("data-a3d", preset);
      if (group.persp) el.style.setProperty("--persp", `${group.persp}px`);

      const cycle = typeof group.stagger === "number" ? group.stagger : STAGGER_CYCLE;
      el._a3dStagger = group.stagger ? i % cycle : 0;
      items.push(el);
    });
  }

  if (!items.length) return;

  if (reduceMotion) {
    for (const el of items) {
      el.style.setProperty("--enter", "1");
      el.style.setProperty("--p", "0.5");
    }
    return;
  }

  // Only elements near the viewport are measured each frame. `will-change` is
  // applied through the same class, so the compositor is not asked to promote
  // every animated element on the page at once.
  const active = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          active.add(entry.target);
          entry.target.classList.add("a3d-on");
        } else {
          active.delete(entry.target);
          entry.target.classList.remove("a3d-on");
          // Park it at whichever end it left by, so an element scrolled past
          // and returned to does not pop.
          const above = entry.boundingClientRect.top < 0;
          entry.target.style.setProperty("--enter", above ? "1" : "0");
        }
      }
      schedule();
    },
    { rootMargin: "20% 0px 20% 0px" }
  );
  for (const el of items) io.observe(el);

  let ticking = false;

  function update() {
    ticking = false;
    const vh = window.innerHeight || 1;
    const span = vh * ENTER_SPAN;

    // An element only finishes arriving once its top has risen `span` pixels
    // up the viewport. Near the end of the document there is no longer that
    // much scroll left to give, so the last elements on the page, the whole
    // footer included, would sit part-faded forever with no way to finish.
    // Credit them with the scroll that can no longer happen: this is zero for
    // most of the page and grows only as the document runs out.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const remaining = Math.max(0, maxScroll - window.scrollY);
    const endBoost = Math.max(0, span - remaining);

    // Read every rect before writing any property: interleaving them forces a
    // layout per element instead of one for the whole batch.
    const list = Array.from(active);
    const rects = list.map((el) => el.getBoundingClientRect());

    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      const rect = rects[i];

      const travel = vh - rect.top - el._a3dStagger * STAGGER_PX + endBoost;
      const enter = easeOutCubic(clamp01(travel / span + PRIMER));
      const p = clamp01((vh - rect.top) / (vh + rect.height));

      el.style.setProperty("--enter", enter.toFixed(4));
      el.style.setProperty("--p", p.toFixed(4));
    }
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  document.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
}
