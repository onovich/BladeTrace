"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  EASING_NAMES,
  validateAttackPattern,
  validatePatternLibrary
} = require("../app/pattern-validation.js");
const {
  ATTACK_PATTERNS,
  PLAYER_POSITION
} = require("../app/attack-patterns.js");

function createPattern() {
  return {
    name: "测试招式",
    description: "用于验证招式配置规则。",
    kind: "NORMAL",
    parryWindowMs: 150,
    damage: 25,
    postureGain: 25,
    playerHurtboxRadius: 25,
    segments: [
      {
        label: "前摇",
        p0: { x: 300, y: 100 },
        p1: { x: 240, y: 180 },
        p2: { x: 210, y: 330 },
        p3: { x: 240, y: 430 },
        durationMs: 500,
        easing: "easeOutCubic"
      },
      {
        label: "落点",
        p0: { x: 240, y: 430 },
        p1: { x: 270, y: 470 },
        p2: { x: 300, y: 530 },
        p3: { x: 300, y: 570 },
        durationMs: 220,
        easing: "easeInExpo"
      }
    ]
  };
}

test("validates every shipped ordinary-attack preset at the public pattern seam", () => {
  const result = validatePatternLibrary(ATTACK_PATTERNS, { playerPosition: PLAYER_POSITION });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.results).length, 6);
  Object.values(result.results).forEach((patternResult) => {
    assert.equal(patternResult.isValid, true);
    assert.equal(patternResult.terminalImpact.hitsPlayerHurtbox, true);
  });
  assert.ok(EASING_NAMES.includes("easeInExpo"));
});

test("rejects invalid duration, easing, continuity, hurtbox, and parry-window constraints", () => {
  const pattern = createPattern();
  pattern.segments[0].durationMs = 49;
  pattern.segments[1].easing = "unrecognized-easing";
  pattern.segments[1].p0 = { x: 241, y: 430 };
  pattern.playerHurtboxRadius = 10;
  pattern.parryWindowMs = 1001;

  const result = validateAttackPattern(pattern, { playerPosition: PLAYER_POSITION });
  const errorCodes = result.errors.map((error) => error.code);

  assert.equal(result.isValid, false);
  assert.ok(errorCodes.includes("SEGMENT_DURATION_OUT_OF_RANGE"));
  assert.ok(errorCodes.includes("UNKNOWN_EASING"));
  assert.ok(errorCodes.includes("SEGMENT_ENDPOINT_DISCONTINUITY"));
  assert.ok(errorCodes.includes("PLAYER_HURTBOX_RADIUS_OUT_OF_RANGE"));
  assert.ok(errorCodes.includes("PARRY_WINDOW_OUT_OF_RANGE"));
});

test("keeps an intentional terminal miss playable while flagging it for the designer", () => {
  const pattern = createPattern();
  pattern.segments[1].p3 = { x: 430, y: 400 };

  const result = validateAttackPattern(pattern, { playerPosition: PLAYER_POSITION });

  assert.equal(result.isValid, true);
  assert.equal(result.terminalImpact.hitsPlayerHurtbox, false);
  assert.ok(result.warnings.some((warning) => warning.code === "TERMINAL_ENDPOINT_MISSES_PLAYER_HURTBOX"));
});
