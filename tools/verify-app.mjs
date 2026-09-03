import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const files = {
  html: resolve(root, "app", "index.html"),
  css: resolve(root, "app", "style.css"),
  script: resolve(root, "app", "game.js"),
  patternValidation: resolve(root, "app", "pattern-validation.js"),
  attackPatterns: resolve(root, "app", "attack-patterns.js")
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
const patternDataScript = readFileSync(files.attackPatterns, "utf8");
const patternValidation = require(files.patternValidation);
const attackPatterns = require(files.attackPatterns);
const patternReport = patternValidation.validatePatternLibrary(attackPatterns.ATTACK_PATTERNS, {
  playerPosition: attackPatterns.PLAYER_POSITION
});

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
  "enemy-posture-bar",
  "player-hp-bar",
  "pattern-description",
  "player-status",
  "timing-feedback"
];

requiredIds.forEach((id) => {
  assert(html.includes('id="' + id + '"'), "Missing required DOM id: " + id);
  assert(script.includes('"' + id + '"'), "Game engine does not reference DOM id: " + id);
});

[
  "spiral-approach",
  "deceptive-pause",
  "ashina-flurry"
].forEach((patternId) => {
  assert(patternDataScript.includes(patternId), "Missing shipped attack pattern: " + patternId);
});

const patternSelectMatch = html.match(/<select id="pattern-select"[\s\S]*?<\/select>/);
assert(patternSelectMatch, "Missing attack-pattern select.");
const patternOptionIds = Array.from(patternSelectMatch[0].matchAll(/<option value="([^"]+)"/g), (match) => match[1]);
Object.keys(attackPatterns.ATTACK_PATTERNS).forEach((patternId) => {
  assert(patternOptionIds.includes(patternId), "Attack-pattern select is missing data pattern: " + patternId);
});
patternOptionIds.forEach((patternId) => {
  assert(Object.hasOwn(attackPatterns.ATTACK_PATTERNS, patternId), "Attack-pattern select references unknown data pattern: " + patternId);
});

[
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
  "handleCanvasPointerDown",
  "validateBuiltInPatternLibrary",
  "ensureCurrentPatternCanStart",
  "getCurrentPatternValidation",
  "updatePatternDescription"
].forEach((feature) => {
  assert(script.includes(feature), "Missing merged gameplay feature: " + feature);
});

assert(html.includes('role="progressbar"'), "HUD progress bars need accessible semantics.");
assert(css.includes(":focus-visible"), "Interactive controls need visible keyboard focus.");
assert(!html.includes("http://") && !html.includes("https://"), "The standalone demo should not require remote runtime assets.");
assert(!script.includes("localStorage") && !script.includes("sessionStorage"), "The local pattern editor must not persist browser state.");
assert(html.includes('src="pattern-validation.js"') && html.includes('src="attack-patterns.js"'), "The standalone entry point must load pattern rules before the game engine.");
assert(patternReport.isValid, "Every shipped attack pattern must pass the public configuration validator.");
assert(!script.includes("enemyDamage") && !script.includes("enemyHp"), "Perfect parries must build enemy posture without dealing hidden enemy HP damage.");
assert(html.includes("玩家受击区") && !html.includes("玩家判定区"), "The editor must distinguish the player hurtbox from the parry window.");
assert(script.includes("center: PLAYER_POSITION"), "The player hurtbox must remain at the fixed player position.");
assert(script.includes("this.elapsedMs >= this.totalDurationMs) this.resolveAttackImpact()"), "Only the terminal attack time may resolve a hurtbox impact.");
assert(html.includes("拖橙色 <strong>W</strong> 调内置弹反判定窗"), "The canvas editor must expose a direct parry-window handle.");

console.log("BladeTrace static app verification passed.");
