"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  EASING_NAMES,
  validateAttackPattern,
  validatePatternLibrary,
  validateBossLibrary,
  resolveBossPhase
} = require("../app/pattern-validation.js");
const {
  ATTACK_PATTERNS,
  BOSS_LIBRARY,
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
  assert.equal(Object.keys(result.results).length, 9);
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

test("validates shipped multi-phase bosses and resolves phases from enemy posture", () => {
  const result = validateBossLibrary(BOSS_LIBRARY, ATTACK_PATTERNS);
  const cinderWarden = BOSS_LIBRARY["cinder-warden"];

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.results).length, 3);
  assert.equal(cinderWarden.phases.length, 3);
  assert.equal(resolveBossPhase(cinderWarden, 0).phaseIndex, 0);
  assert.equal(resolveBossPhase(cinderWarden, 49).phaseIndex, 0);
  assert.equal(resolveBossPhase(cinderWarden, 50).phaseIndex, 1);
  assert.equal(resolveBossPhase(cinderWarden, 75).phaseIndex, 2);
});

test("rejects invalid boss phase thresholds and unknown phase attack patterns", () => {
  const bosses = JSON.parse(JSON.stringify(BOSS_LIBRARY));
  bosses["cinder-warden"].phases[0].postureThreshold = 10;
  bosses["cinder-warden"].phases[1].postureThreshold = 10;
  bosses["cinder-warden"].phases[2].patternIds = ["not-a-shipped-pattern"];

  const result = validateBossLibrary(bosses, ATTACK_PATTERNS);
  const errorCodes = result.errors.map((error) => error.code);

  assert.equal(result.isValid, false);
  assert.ok(errorCodes.includes("FIRST_PHASE_THRESHOLD_MUST_BE_ZERO"));
  assert.ok(errorCodes.includes("PHASE_THRESHOLD_NOT_STRICTLY_INCREASING"));
  assert.ok(errorCodes.includes("UNKNOWN_PHASE_PATTERN"));
});
