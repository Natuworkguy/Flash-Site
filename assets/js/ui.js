export function initUI() {
  initNavScroll();
  initMobileNav();
  initHostToggle();
  initTabs();
  initOsToggle();
  initCopyButtons();
  initTilt();
  initScrollTopButton();
  initVideoThumbFallback();
  initDownload();
}

function initNavScroll() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;

  const close = () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

  document.addEventListener("click", (e) => {
    if (!links.contains(e.target) && !toggle.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function initHostToggle() {
  const cards = document.querySelectorAll(".host-card");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!cards.length || reduceMotion) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % cards.length;
    cards.forEach((c, idx) => c.classList.toggle("active", idx === i));
  }, 2600);
}

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
  });
}

function initOsToggle() {
  const osTabs = document.querySelectorAll(".os-tab");
  const osPanels = document.querySelectorAll(".os-panel");
  if (!osTabs.length) return;

  function activate(os) {
    osTabs.forEach((t) => {
      const active = t.dataset.os === os;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });
    osPanels.forEach((p) => p.classList.toggle("active", p.dataset.osPanel === os));
  }

  osTabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.os)));

  const isWindows = /Windows/i.test(navigator.userAgent);
  activate(isWindows ? "windows" : "unix");
}

function initVideoThumbFallback() {
  const thumb = document.querySelector(".video-embed-thumb");
  const fallback = thumb ? thumb.dataset.fallback : null;
  if (!thumb || !fallback) return;

  const useFallback = () => {
    if (thumb.src !== fallback) thumb.src = fallback;
  };

  thumb.addEventListener("error", useFallback, { once: true });
  thumb.addEventListener(
    "load",
    () => {
      // maxresdefault.jpg falls back to a 120x90 grey placeholder (HTTP 200,
      // not a 404) when a video has no high-res thumbnail, so check dimensions
      // rather than relying on the error event alone.
      if (thumb.naturalWidth <= 120) useFallback();
    },
    { once: true }
  );
}

function initCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      flashCopied(btn);
    });
  });
}

function flashCopied(btn) {
  const label = btn.querySelector(".copy-label");
  if (label) {
    const prev = label.textContent;
    label.textContent = "Copied!";
    setTimeout(() => (label.textContent = prev), 1600);
  } else {
    const prev = btn.textContent;
    btn.classList.add("copied");
    btn.textContent = "Copied";
    setTimeout(() => {
      btn.textContent = prev;
      btn.classList.remove("copied");
    }, 1600);
  }
}

function initTilt() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tiltCard = document.getElementById("tilt-card");
  const termWindow = tiltCard ? tiltCard.querySelector(".term-window") : null;
  if (!tiltCard || !termWindow || reduceMotion || !matchMedia("(hover: hover)").matches) return;

  tiltCard.addEventListener("mousemove", (e) => {
    const rect = tiltCard.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    termWindow.style.transform = `rotateX(${(-py * 10 + 4).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg)`;
  });
  tiltCard.addEventListener("mouseleave", () => {
    termWindow.style.transform = "rotateX(6deg) rotateY(0deg)";
  });
}

function initScrollTopButton() {
  const btn = document.getElementById("scroll-top");
  if (!btn) return;
  const onScroll = () => btn.classList.toggle("visible", window.scrollY > 600);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
}

// The installer download: the button offers the visitor's own system, the note under it the other two and what to
// do once it has downloaded. Without scripts it is the Windows one, with macOS and Linux linked under it.
function initDownload() {
  const btn = document.querySelector("[data-download]");
  const note = document.querySelector("[data-download-note]");
  if (!btn || !note) return;
  const ua = navigator.userAgent;
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  const os = /Win/i.test(plat) || /Windows/.test(ua) ? "windows" : /Mac|iPhone|iPad/i.test(plat + ua) ? "macos" : /Linux|X11|CrOS/i.test(plat + ua) ? "linux" : "windows";
  const NAMES = { windows: "Windows", macos: "macOS", linux: "Linux" };
  const FILES = { windows: "assets/downloads/flash-setup.exe", macos: "assets/downloads/install-flash-macos.zip", linux: "assets/downloads/install-flash.sh" };
  const HOW = {
    windows: "Open it: it asks if you want the dev version, then shows each step and tells you when it is done. Windows may ask first: choose More info, then Run anyway.",
    macos: "Open the zip, then right-click Install Flash and choose Open (the first time, macOS asks). It asks if you want the dev version, then shows each step.",
    linux: "Then run <code>bash install-flash.sh</code>: it asks if you want the dev version, then shows each step in a window.",
  };
  btn.href = FILES[os];
  btn.querySelector("span").textContent = `Download the installer for ${NAMES[os]}`;
  const others = Object.keys(NAMES).filter((k) => k !== os).map((k) => `<a href="${FILES[k]}" download>${NAMES[k]}</a>`);
  note.innerHTML = `${HOW[os]} Also for ${others[0]} and ${others[1]}, or use a command below.`;
}
