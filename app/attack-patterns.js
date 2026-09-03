(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BladeTraceAttackPatterns = api;
}(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const ENEMY_POSITION = Object.freeze({ x: 300, y: 100 });
  const PLAYER_POSITION = Object.freeze({ x: 300, y: 570 });
  const PLAYER_HURTBOX_RADIUS = 25;

  const ATTACK_PATTERNS = Object.freeze({
    delayed: {
      name: "苇名流·延迟斩",
      description: "长前摇后快速落点，练习在最后一瞬读节奏。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "蓄力前摇", p0: ENEMY_POSITION, p1: { x: 120, y: 150 }, p2: { x: 80, y: 300 }, p3: { x: 150, y: 380 }, durationMs: 900, easing: "easeOutCubic" },
        { label: "骤降斩击", p0: { x: 150, y: 380 }, p1: { x: 200, y: 440 }, p2: { x: 280, y: 520 }, p3: PLAYER_POSITION, durationMs: 220, easing: "easeInExpo" }
      ]
    },
    triple: {
      name: "三连斩·快速变奏",
      description: "连续变向的三段斩击，练习在节奏变化后保持稳定。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "一之型", p0: ENEMY_POSITION, p1: { x: 450, y: 180 }, p2: { x: 400, y: 350 }, p3: { x: 260, y: 420 }, durationMs: 500, easing: "easeOutCubic" },
        { label: "二之型", p0: { x: 260, y: 420 }, p1: { x: 100, y: 300 }, p2: { x: 150, y: 480 }, p3: { x: 280, y: 520 }, durationMs: 400, easing: "easeInOutSine" },
        { label: "终结型", p0: { x: 280, y: 520 }, p1: { x: 350, y: 450 }, p2: { x: 320, y: 540 }, p3: PLAYER_POSITION, durationMs: 180, easing: "easeInExpo" }
      ]
    },
    overhead: {
      name: "跳劈·极速下斩",
      description: "抬升后急速下落，练习面对短终结段时的反应。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "上挑蓄势", p0: ENEMY_POSITION, p1: { x: 300, y: 40 }, p2: { x: 200, y: 60 }, p3: { x: 200, y: 200 }, durationMs: 750, easing: "easeOutCubic" },
        { label: "极速下劈", p0: { x: 200, y: 200 }, p1: { x: 200, y: 350 }, p2: { x: 290, y: 480 }, p3: PLAYER_POSITION, durationMs: 160, easing: "easeInExpo" }
      ]
    },
    "spiral-approach": {
      name: "螺旋突进·S 形迷踪",
      description: "S 形路径遮蔽真正落点；当前仍按普通弹反规则结算。",
      kind: "NORMAL",
      parryWindowMs: 170,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "S 形迷踪", p0: ENEMY_POSITION, p1: { x: 90, y: 320 }, p2: { x: 450, y: 460 }, p3: { x: 445, y: 290 }, durationMs: 900, easing: "slowFastPause" },
        { label: "死角突进", p0: { x: 445, y: 290 }, p1: { x: 485, y: 205 }, p2: { x: 365, y: 465 }, p3: PLAYER_POSITION, durationMs: 280, easing: "easeOutExpo" }
      ]
    },
    "deceptive-pause": {
      name: "伪装慢刀·迟滞暴击",
      description: "故意停顿后再转入终结段，练习避免被前摇误导。",
      kind: "NORMAL",
      parryWindowMs: 190,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "超长慢刀", p0: ENEMY_POSITION, p1: { x: 300, y: 80 }, p2: { x: 480, y: 90 }, p3: { x: 500, y: 175 }, durationMs: 1500, easing: "linear" },
        { label: "空中迟滞", p0: { x: 500, y: 175 }, p1: { x: 520, y: 230 }, p2: { x: 455, y: 245 }, p3: { x: 455, y: 285 }, durationMs: 400, easing: "easeInCubic" },
        { label: "变光下劈", p0: { x: 455, y: 285 }, p1: { x: 420, y: 360 }, p2: { x: 335, y: 485 }, p3: PLAYER_POSITION, durationMs: 250, easing: "easeOutExpo" }
      ]
    },
    "ashina-flurry": {
      name: "苇名连斩·交错突袭",
      description: "交错折返后命中，练习识别多段曲线的最终方向。",
      kind: "NORMAL",
      parryWindowMs: 180,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "起势", p0: ENEMY_POSITION, p1: { x: 450, y: 230 }, p2: { x: 400, y: 120 }, p3: { x: 420, y: 250 }, durationMs: 500, easing: "easeInOutSine" },
        { label: "交错", p0: { x: 420, y: 250 }, p1: { x: 490, y: 425 }, p2: { x: 175, y: 310 }, p3: { x: 235, y: 420 }, durationMs: 400, easing: "easeInQuad" },
        { label: "终结", p0: { x: 235, y: 420 }, p1: { x: 265, y: 470 }, p2: { x: 300, y: 520 }, p3: PLAYER_POSITION, durationMs: 300, easing: "easeOutExpo" }
      ]
    }
  });

  return Object.freeze({
    ENEMY_POSITION: ENEMY_POSITION,
    PLAYER_POSITION: PLAYER_POSITION,
    ATTACK_PATTERNS: ATTACK_PATTERNS
  });
}));
