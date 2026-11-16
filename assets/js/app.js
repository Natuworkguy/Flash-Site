import { includePartials } from "./include.js";
import { initUI } from "./ui.js";
import { initTerminal } from "./terminal.js";
import { initScrollFx } from "./scroll.js";
import { initBackground } from "./background.js";
import { initScroll3D } from "./scroll3d.js";

async function boot() {
  await includePartials();
  initScroll3D();
  initUI();
  initTerminal();
  initScrollFx();
  initBackground();
  // a link to a section (flashproject.dev/#download) lands on it once the sections have loaded
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

boot();
