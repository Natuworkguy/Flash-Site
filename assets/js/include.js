import { SITE } from "./config.js";

export async function includePartials(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-include]"));
  await Promise.all(
    nodes.map(async (node) => {
      const path = node.getAttribute("data-include");
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to load partial: ${path} (${res.status})`);
      const raw = await res.text();
      node.innerHTML = applyTokens(raw);
      node.removeAttribute("data-include");
    })
  );
}

function applyTokens(html) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    const value = path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), SITE);
    return value !== undefined ? String(value) : match;
  });
}
