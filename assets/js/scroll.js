// Drives every scroll-linked effect on the page: the top progress bar and
// any element marked [data-scrub]. Elements get a --p custom property
// (0 to 1) representing how far they've traveled through the viewport, and
// CSS reads that property directly. Nothing here plays on a timer; it only
// moves when the user scrolls, and reverses cleanly when they scroll back up.
export function initScrollFx() {
  const progressBar = document.getElementById("scroll-progress");
  const scrubEls = Array.from(document.querySelectorAll("[data-scrub]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    scrubEls.forEach((el) => el.style.setProperty("--p", "1"));
    if (progressBar) progressBar.style.transform = "scaleX(1)";
    return;
  }

  let ticking = false;

  function update() {
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      progressBar.style.transform = `scaleX(${p})`;
    }

    const vh = window.innerHeight;
    scrubEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const total = rect.height + vh;
      const traveled = vh - rect.top;
      const p = Math.min(Math.max(traveled / total, 0), 1);
      el.style.setProperty("--p", p.toFixed(4));
    });

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
