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
  "btn-editor",
  "runtime-editor-bar",
  "runtime-editor-selection",
  "btn-runtime-editor-split",
  "btn-runtime-editor-delete",
  "btn-runtime-editor-advanced",
  "btn-runtime-editor-exit",
  "editor-panel",
  "btn-editor-close",
  "editor-pattern-name",
  "editor-segment-list",
  "editor-selection-description",
  "editor-segment-name",
  "editor-duration",
  "editor-easing",
  "editor-hurtbox-radius",
  "editor-hurtbox-radius-number",
  "editor-hurtbox-value",
  "editor-parry-window",
  "editor-parry-window-number",
  "editor-parry-window-value",
  "editor-parry-window-status",
  "btn-editor-use-pattern-window",
  "btn-editor-add-segment",
  "btn-editor-delete-segment",
  "btn-editor-reset-pattern",
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
  "drawCursorTrail",
  "toggleEditorMode",
  "splitBezierSegment",
  "setSegmentPoint",
  "setPlayerHurtboxRadius",
  "getPlayerHurtbox",
  "isInsidePlayerHurtbox",
  "findPlayerHurtboxResizeHandle",
  "resolveAttackImpact",
  "triggerAttackMiss",
  "normalizeParryWindowMs",
  "setPatternParryWindow",
  "applyPatternParryWindow",
  "getParryWindowPreview",
  "findParryWindowResizeHandle",
  "setParryWindowFromCanvasPoint",
  "toggleAdvancedEditorPanel",
  "drawParryWindowPreview",
  "addSegmentAfterSelection",
  "deleteSelectedSegment",
  "handleCanvasPointerDown"
].forEach((feature) => {
  assert(script.includes(feature), "Missing merged gameplay feature: " + feature);
});

assert(html.includes('role="progressbar"'), "HUD progress bars need accessible semantics.");
assert(css.includes(":focus-visible"), "Interactive controls need visible keyboard focus.");
assert(!html.includes("http://") && !html.includes("https://"), "The standalone demo should not require remote runtime assets.");
assert(!script.includes("localStorage") && !script.includes("sessionStorage"), "The local pattern editor must not persist browser state.");
assert(html.includes("玩家受击区") && !html.includes("玩家判定区"), "The editor must distinguish the player hurtbox from the parry window.");
assert(script.includes("center: PLAYER_POSITION"), "The player hurtbox must remain at the fixed player position.");
assert(script.includes("this.elapsedMs >= this.totalDurationMs) this.resolveAttackImpact()"), "Only the terminal attack time may resolve a hurtbox impact.");
assert(html.includes("拖橙色 <strong>W</strong> 调内置弹反判定窗"), "The canvas editor must expose a direct parry-window handle.");

console.log("BladeTrace static app verification passed.");
