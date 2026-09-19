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
}

boot();
