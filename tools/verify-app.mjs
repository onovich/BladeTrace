import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = {
  html: resolve(root, "app", "index.html"),
  css: resolve(root, "app", "style.css"),
  script: resolve(root, "app", "game.js")
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

Object.entries(files).forEach(([name, filePath]) => {
  assert(existsSync(filePath), "Missing " + name + " file: " + filePath);
});

const html = readFileSync(files.html, "utf8");
const css = readFileSync(files.css, "utf8");
const script = readFileSync(files.script, "utf8");

const requiredIds = [
  "gameCanvas",
  "pattern-select",
  "window-select",
  "show-wireframe",
  "auto-loop",
  "sound-toggle",
  "btn-attack",
  "btn-parry",
  "btn-reset",
  "btn-deathblow",
  "enemy-hp-bar",
  "enemy-posture-bar",
  "player-hp-bar",
  "player-status",
  "timing-feedback"
];

requiredIds.forEach((id) => {
  assert(html.includes('id="' + id + '"'), "Missing required DOM id: " + id);
  assert(script.includes('"' + id + '"'), "Game engine does not reference DOM id: " + id);
});

[
  "spiral-thrust",
  "deceptive-pause",
  "ashina-flurry",
  "triggerParrySuccess",
  "triggerPlayerHit",
  "enterDeathblowState",
  "executeDeathblow",
  "scheduleAutoStart",
  "drawWireframe",
  "drawCursorTrail"
].forEach((feature) => {
  assert(script.includes(feature), "Missing merged gameplay feature: " + feature);
});

assert(html.includes('role="progressbar"'), "HUD progress bars need accessible semantics.");
assert(css.includes(":focus-visible"), "Interactive controls need visible keyboard focus.");
assert(!html.includes("http://") && !html.includes("https://"), "The standalone demo should not require remote runtime assets.");

console.log("BladeTrace static app verification passed.");
