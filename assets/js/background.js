// Animated dithered cloud field behind the hero.
//
// Billowing fractal clouds, posterised to a handful of colours and rendered
// through an 8x8 Bayer ordered dither, which is what produces the visible dot
// matrix rather than a smooth gradient.
//
// The whole thing is drawn into a deliberately tiny buffer, sized so one
// buffer pixel covers about DOT screen pixels, and stretched across the layer
// by the browser with `image-rendering: pixelated`. That does two jobs at
// once: it makes the dither dots big enough to read as texture, and it keeps
// the per-frame cost to a few tens of thousands of pixels instead of a few
// million.

/** Size of one dither cell, in CSS pixels. The buffer is sized so each of its
 *  pixels lands on roughly this many screen pixels once upscaled, which keeps
 *  the dots the same visual size on a phone and on a wide desktop, and keeps
 *  the per-frame cost proportional to the layer's area rather than exploding
 *  on tall, narrow viewports. */
const DOT = 6.5;

/** Hard bounds on either buffer dimension, guarding extreme viewports. */
const MIN_BUFFER = 24;
const MAX_BUFFER = 260;

/** Animation rate. The motion is slow, so there is nothing to gain from 60. */
const FPS = 20;

/** Fallback clearing over the hero copy - centre and half-extents as
 *  fractions of the layer - used only if the copy cannot be measured. The
 *  real values come from the rendered text in measureClearing(). */
const CLEARING_FALLBACK = { cx: 0.5, cy: 0.34, hx: 0.44, hy: 0.26 };

/** Distance, in CSS pixels, over which the copy's shading fades back to full
 *  brightness. Expressed in pixels rather than layer fractions so it stays
 *  visually consistent between a phone and a wide desktop. */
const FEATHER_PX_X = 150;
const FEATHER_PX_Y = 130;

/** How much cloud density survives directly over the hero copy. Thinning the
 *  density rather than capping the palette is deliberate: a cap leaves every
 *  pixel sitting on the darkest cloud colour, which floods the area with a
 *  flat wash, whereas thinning drops most pixels below FLOOR and back to
 *  clean background, leaving only a sparse dithered fringe behind the text. */
const COPY_DENSITY = 0.18;

/** Below this density the field is cleared outright instead of being
 *  dithered. Without a floor, the 0->1 step scatters isolated dots across
 *  otherwise empty background, which reads as dirt rather than cloud. */
const FLOOR = 0.15;

/** Octaves of noise summed into each cloud sample. Past three the detail is
 *  finer than one dither cell, so it costs a full noise evaluation to produce
 *  something the posterisation throws away. */
const OCTAVES = 3;

/** Contrast applied to the raw noise before posterising. GAIN spreads the
 *  midtones so the palette steps land on visible cloud structure; BIAS sets
 *  how much of the field clears entirely. */
const GAIN = 2.15;
const BIAS = 0.56;

/** How fast the cloud evolves, in noise-units per second. */
const EVOLVE = 0.055;

/** Palette, transparent through to the brightest highlight. Level 0 is fully
 *  transparent so the page background shows through the gaps. Swap these RGBA
 *  values to recolour the field; nothing else depends on the hues. */
const PALETTE = [
  [0, 0, 0, 0],
  [92, 36, 14, 125],
  [163, 62, 20, 195],
  [226, 98, 30, 225],
  [255, 140, 52, 238],
  [255, 184, 104, 248],
];

// Standard 8x8 Bayer threshold matrix, normalised to 0..1. Its recursive
// structure is what makes the dot pattern look ordered and printed rather
// than like random noise.
const BAYER = new Float32Array([
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64));

function hash3(x, y, z) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Trilinearly interpolated value noise. Cheaper than gradient noise and, once
// four octaves are stacked and the result is posterised, indistinguishable.
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);

  const c000 = hash3(xi, yi, zi),         c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi),     c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1),     c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);

  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

const FBM_NORM = 1 / (1 - Math.pow(0.5, OCTAVES));

function fbm(x, y, z) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < OCTAVES; i++) {
    sum += vnoise(x * freq, y * freq, z * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum * FBM_NORM;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

export function initBackground() {
  const canvas = document.getElementById("bg-dither");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, image = null, data = null;
  let cw = 0, ch = 0, coarse = null;
  // Timestamp of the last painted frame, so a resize can repaint the field
  // where it left off. Setting canvas.width clears the canvas, and without
  // this the layer flashes empty until the next animation frame.
  let lastSeconds = 0;
  // Per-pixel envelope deciding where, and how densely, cloud may form.
  // Recomputed only on resize.
  let shape = null;

  // The clearing tracks the hero copy rather than being a fixed shape: the
  // headline wraps to a different number of lines at every breakpoint, and on
  // a short viewport the copy runs past the bottom of the layer entirely.
  //
  // It is measured as the union box of the copy, not an ellipse. An ellipse
  // sized to a tall copy block only reaches its full width at its own vertical
  // centre, so the ends of a wide headline sat outside it and got covered.
  function measureClearing(layerW, layerH) {
    const parts = [".hero-title", ".hero-sub", ".hero-cta"]
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (!parts.length || !layerW || !layerH) return CLEARING_FALLBACK;

    const scrollY = window.scrollY;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const r of parts) {
      if (r.left < left) left = r.left;
      if (r.right > right) right = r.right;
      if (r.top + scrollY < top) top = r.top + scrollY;
      if (r.bottom + scrollY > bottom) bottom = r.bottom + scrollY;
    }
    if (!(right > left) || !(bottom > top)) return CLEARING_FALLBACK;

    return {
      cx: ((left + right) / 2) / layerW,
      cy: ((top + bottom) / 2) / layerH,
      hx: (right - left) / 2 / layerW,
      hy: (bottom - top) / 2 / layerH,
    };
  }

  function resize() {
    // The canvas' own CSS box gives the layer's size; height comes from the
    // `vh`-based rule in the stylesheet, so it is read rather than recomputed.
    const box = canvas.getBoundingClientRect();
    const layerW = Math.max(box.width, 1);
    const layerH = Math.max(box.height, 1);

    w = Math.min(MAX_BUFFER, Math.max(MIN_BUFFER, Math.round(layerW / DOT)));
    h = Math.min(MAX_BUFFER, Math.max(MIN_BUFFER, Math.round(layerH / DOT)));
    canvas.width = w;
    canvas.height = h;

    const clear = measureClearing(layerW, layerH);
    image = ctx.createImageData(w, h);
    data = image.data;

    // Noise is evaluated on a half-resolution lattice and interpolated up.
    // The cloud field is smooth at this scale, so the interpolated result is
    // visually identical to sampling every pixel, at a quarter of the cost;
    // the dither that actually needs full resolution is applied afterwards.
    cw = (w >> 1) + 2;
    ch = (h >> 1) + 2;
    coarse = new Float32Array(cw * ch);

    // Precompute the envelope that decides where cloud is allowed to form.
    // Three factors multiply together:
    //   vertical   - strongest at the top, gone before the layer's bottom
    //                edge so the rest of the page starts on clean background
    //   horizontal - heavier along the left and right margins
    //   copy       - thinned across the measured box around the hero text
    //
    // The copy term is the important one. The cloud is driven by noise that
    // keeps evolving, so without it the headline would be legible or not
    // depending on where the fractal happened to drift.
    shape = new Float32Array(w * h);

    const featherX = FEATHER_PX_X / layerW;
    const featherY = FEATHER_PX_Y / layerH;
    for (let y = 0; y < h; y++) {
      const ny = y / (h - 1);
      const vertical = (1 - smoothstep(0.66, 1.0, ny)) * smoothstep(-0.34, 0.08, ny);
      for (let x = 0; x < w; x++) {
        const nx = x / (w - 1);
        const edge = Math.abs(nx - 0.5) * 2;
        const horizontal = 0.50 + 0.50 * smoothstep(0.08, 0.95, edge);

        // Distance outside the copy box, zero anywhere inside it, in units
        // of the feather distance.
        const ox = Math.max(0, Math.abs(nx - clear.cx) - clear.hx) / featherX;
        const oy = Math.max(0, Math.abs(ny - clear.cy) - clear.hy) / featherY;
        const away = smoothstep(0, 1, Math.sqrt(ox * ox + oy * oy));
        const copy = COPY_DENSITY + (1 - COPY_DENSITY) * away;

        shape[y * w + x] = vertical * horizontal * copy;
      }
    }
  }

  const LEVELS = PALETTE.length - 1;

  // Highest density any pixel could reach is (GAIN - BIAS) * env, so below
  // this envelope value the pixel can never clear FLOOR. Skipping those
  // outright avoids evaluating the interpolation over the cleared band.
  const ENV_SKIP = FLOOR / (GAIN - BIAS);

  function render(timeSeconds) {
    // Noise is sampled in its own units; these divisors set the cloud scale.
    // Noise units per buffer pixel. Derived from the buffer's width so the
    // clouds stay the same size on screen as the buffer resizes, and equal on
    // both axes so they stay round rather than smeared.
    const sx = 3.2 / w;
    const sy = sx;
    const z = timeSeconds * EVOLVE;
    const driftX = timeSeconds * 0.012;
    const driftY = timeSeconds * -0.006;

    // Pass 1: the cloud field, on the half-resolution lattice.
    for (let cy = 0; cy < ch; cy++) {
      const ny = (cy << 1) * sy + driftY;
      let ci = cy * cw;
      for (let cx = 0; cx < cw; cx++, ci++) {
        coarse[ci] = fbm((cx << 1) * sx + driftX, ny, z);
      }
    }

    // Pass 2: interpolate, shape, posterise and dither at full resolution.
    let i = 0;
    for (let y = 0; y < h; y++) {
      const gy = y * 0.5;
      const gyi = gy | 0;
      const fy = gy - gyi;
      const row0 = gyi * cw;
      const row1 = row0 + cw;

      for (let x = 0; x < w; x++, i += 4) {
        const env = shape[y * w + x];
        if (env < ENV_SKIP) {
          data[i + 3] = 0;
          continue;
        }

        const gx = x * 0.5;
        const gxi = gx | 0;
        const fx = gx - gxi;
        const a = coarse[row0 + gxi], b = coarse[row0 + gxi + 1];
        const c0 = coarse[row1 + gxi], d = coarse[row1 + gxi + 1];
        const top = a + (b - a) * fx;
        const bot = c0 + (d - c0) * fx;
        const n = top + (bot - top) * fy;
        // Bias and gain: pushes the midtones apart so the posterised steps
        // land where the eye reads billowing mass rather than flat fog.
        let density = (n * GAIN - BIAS) * env;
        if (density < FLOOR) {
          data[i + 3] = 0;
          continue;
        }
        if (density > 1) density = 1;

        const s = density * LEVELS;
        const lo = Math.floor(s);
        const frac = s - lo;
        let lvl = lo + (frac > BAYER[(y & 7) * 8 + (x & 7)] ? 1 : 0);
        if (lvl > LEVELS) lvl = LEVELS;

        const c = PALETTE[lvl];
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = c[3];
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  resize();
  render(0);

  // The headline is measured above with whatever font is active at boot. When
  // the webfonts swap in, its wrap and height change, so the clearing has to
  // be measured again against the final layout.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      resize();
      render(lastSeconds);
    });
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      render(lastSeconds);
    }, 180);
  });

  if (reduceMotion) return;

  // Only run while the layer is actually on screen. Once the hero has
  // scrolled away there is nothing to animate, and the loop should not keep
  // burning a core on a canvas nobody can see.
  let onScreen = true;
  const io = new IntersectionObserver(
    ([entry]) => { onScreen = entry.isIntersecting; },
    { threshold: 0 }
  );
  io.observe(canvas);

  const frameInterval = 1000 / FPS;
  let lastFrame = -Infinity;
  const start = performance.now();

  function loop(now) {
    requestAnimationFrame(loop);
    if (!onScreen || document.hidden) return;
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;
    lastSeconds = (now - start) / 1000;
    render(lastSeconds);
  }
  requestAnimationFrame(loop);
}
