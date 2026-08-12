import { includePartials } from "./include.js";
import { initUI } from "./ui.js";
import { initTerminal } from "./terminal.js";
import { initScrollFx } from "./scroll.js";

async function boot() {
  await includePartials();
  initUI();
  initTerminal();
  initScrollFx();
}

boot();
