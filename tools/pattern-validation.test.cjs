"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  EASING_NAMES,
  validateAttackPattern,
  validatePatternLibrary,
  validateBossLibrary,
  resolveBossPhase,
  calculatePhasePostureGain
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
    commitCueLabel: "收势信号",
    commitCueLeadMs: 360,
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
  assert.equal(Object.keys(result.results).length, 29);
  Object.values(result.results).forEach((patternResult) => {
    assert.equal(patternResult.isValid, true);
    assert.equal(patternResult.terminalImpact.hitsPlayerHurtbox, true);
  });
  assert.ok(EASING_NAMES.includes("easeInExpo"));
});

test("rejects invalid duration, easing, continuity, hurtbox, and player-blade constraints", () => {
  const pattern = createPattern();
  pattern.segments[0].durationMs = 49;
  pattern.segments[1].easing = "unrecognized-easing";
  pattern.segments[1].p0 = { x: 241, y: 430 };
  pattern.playerHurtboxRadius = 10;
  pattern.playerOutSpeed = -1;
  pattern.commitCueLabel = "";
  pattern.commitCueLeadMs = 200;

  const result = validateAttackPattern(pattern, { playerPosition: PLAYER_POSITION });
  const errorCodes = result.errors.map((error) => error.code);

  assert.equal(result.isValid, false);
  assert.ok(errorCodes.includes("SEGMENT_DURATION_OUT_OF_RANGE"));
  assert.ok(errorCodes.includes("UNKNOWN_EASING"));
  assert.ok(errorCodes.includes("SEGMENT_ENDPOINT_DISCONTINUITY"));
  assert.ok(errorCodes.includes("PLAYER_HURTBOX_RADIUS_OUT_OF_RANGE"));
  assert.ok(errorCodes.includes("INVALID_PLAYER_BLADE_PARAMETER"));
  assert.ok(errorCodes.includes("MISSING_COMMIT_CUE_LABEL"));
  assert.ok(errorCodes.includes("COMMIT_CUE_LEAD_OUT_OF_RANGE"));
});

test("keeps an intentional terminal miss playable while flagging it for the designer", () => {
  const pattern = createPattern();
  pattern.segments[1].p3 = { x: 430, y: 400 };

  const result = validateAttackPattern(pattern, { playerPosition: PLAYER_POSITION });

  assert.equal(result.isValid, true);
  assert.equal(result.terminalImpact.hitsPlayerHurtbox, false);
  assert.ok(result.warnings.some((warning) => warning.code === "TERMINAL_ENDPOINT_MISSES_PLAYER_HURTBOX"));
});

test("validates the 5-source, 10-boss mechanical-homage catalogue and resolves phases from enemy posture", () => {
  const result = validateBossLibrary(BOSS_LIBRARY, ATTACK_PATTERNS);
  const cinderWarden = BOSS_LIBRARY["cinder-warden"];
  const homageBosses = Object.values(BOSS_LIBRARY).filter((boss) => boss.inspiration.kind === "mechanical-homage");
  const sourceGames = new Set(homageBosses.map((boss) => boss.inspiration.sourceGame));

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.results).length, 13);
  assert.equal(homageBosses.length, 10);
  assert.equal(sourceGames.size, 5);
  assert.ok(Object.values(BOSS_LIBRARY).every((boss) => boss.visualMotif && boss.visualMotif.type && boss.visualMotif.label));
  assert.equal(cinderWarden.phases.length, 3);
  assert.deepEqual(cinderWarden.phases.map((phase) => phase.postureGainScale), [1, 0.5, 0.5]);
  assert.equal(resolveBossPhase(cinderWarden, 0).phaseIndex, 0);
  assert.equal(resolveBossPhase(cinderWarden, 49).phaseIndex, 0);
  assert.equal(resolveBossPhase(cinderWarden, 50).phaseIndex, 1);
  assert.equal(resolveBossPhase(cinderWarden, 75).phaseIndex, 2);
});

test("keeps two successful reads available in every shipped boss phase", () => {
  Object.values(BOSS_LIBRARY).forEach((boss) => {
    let posture = 0;
    const activePhaseIndexes = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const resolved = resolveBossPhase(boss, posture);
      const phase = resolved.phase;
      const pattern = ATTACK_PATTERNS[phase.patternIds[0]];
      activePhaseIndexes.push(resolved.phaseIndex);
      posture = Math.min(100, posture + calculatePhasePostureGain(phase, pattern));
    }

    assert.deepEqual(activePhaseIndexes, [0, 0, 1, 1, 2, 2], boss.name + " should expose each phase twice");
  });
});

test("rejects invalid boss phase thresholds and unknown phase attack patterns", () => {
  const bosses = JSON.parse(JSON.stringify(BOSS_LIBRARY));
  bosses["cinder-warden"].phases[0].postureThreshold = 10;
  bosses["cinder-warden"].phases[1].postureThreshold = 10;
  bosses["cinder-warden"].phases[2].patternIds = ["not-a-shipped-pattern"];
  bosses["cinder-warden"].phases[2].postureGainScale = 0;
  bosses["cinder-warden"].inspiration = { kind: "mechanical-homage" };
  bosses["cinder-warden"].visualMotif = { type: "" };

  const result = validateBossLibrary(bosses, ATTACK_PATTERNS);
  const errorCodes = result.errors.map((error) => error.code);

  assert.equal(result.isValid, false);
  assert.ok(errorCodes.includes("FIRST_PHASE_THRESHOLD_MUST_BE_ZERO"));
  assert.ok(errorCodes.includes("PHASE_THRESHOLD_NOT_STRICTLY_INCREASING"));
  assert.ok(errorCodes.includes("UNKNOWN_PHASE_PATTERN"));
  assert.ok(errorCodes.includes("PHASE_POSTURE_GAIN_SCALE_OUT_OF_RANGE"));
  assert.ok(errorCodes.includes("MISSING_BOSS_INSPIRATION_SOURCE"));
  assert.ok(errorCodes.includes("MISSING_BOSS_VISUAL_MOTIF_LABEL"));
});
