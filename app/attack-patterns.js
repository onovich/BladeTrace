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
    },
    "cinder-verdict": {
      name: "烬令·落印",
      description: "先在半空悬置，再以沉重直线裁决；警惕短促的最终落点。",
      kind: "NORMAL",
      parryWindowMs: 145,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "悬印", p0: ENEMY_POSITION, p1: { x: 300, y: 150 }, p2: { x: 430, y: 175 }, p3: { x: 410, y: 265 }, durationMs: 720, easing: "easeOutCubic" },
        { label: "落印", p0: { x: 410, y: 265 }, p1: { x: 380, y: 390 }, p2: { x: 315, y: 510 }, p3: PLAYER_POSITION, durationMs: 200, easing: "easeInExpo" }
      ]
    },
    "raven-whorl": {
      name: "鸦羽·回旋假象",
      description: "先横掠再反折，真正的命中方向会在最后一拍显露。",
      kind: "NORMAL",
      parryWindowMs: 165,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "横掠", p0: ENEMY_POSITION, p1: { x: 120, y: 200 }, p2: { x: 470, y: 190 }, p3: { x: 410, y: 365 }, durationMs: 580, easing: "easeInOutSine" },
        { label: "折羽", p0: { x: 410, y: 365 }, p1: { x: 350, y: 485 }, p2: { x: 180, y: 390 }, p3: { x: 235, y: 490 }, durationMs: 320, easing: "easeInQuad" },
        { label: "归巢", p0: { x: 235, y: 490 }, p1: { x: 285, y: 500 }, p2: { x: 325, y: 535 }, p3: PLAYER_POSITION, durationMs: 150, easing: "easeOutExpo" }
      ]
    },
    "bell-crush": {
      name: "鸣钟·坠响",
      description: "宽弧摆荡后垂直压下；节奏像钟摆，却会在末端骤然收束。",
      kind: "NORMAL",
      parryWindowMs: 155,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      segments: [
        { label: "钟摆", p0: ENEMY_POSITION, p1: { x: 480, y: 100 }, p2: { x: 460, y: 310 }, p3: { x: 300, y: 330 }, durationMs: 650, easing: "easeInOutSine" },
        { label: "坠响", p0: { x: 300, y: 330 }, p1: { x: 270, y: 410 }, p2: { x: 300, y: 520 }, p3: PLAYER_POSITION, durationMs: 220, easing: "easeInExpo" }
      ]
    }
  });

  const BOSS_LIBRARY = Object.freeze({
    "cinder-warden": {
      name: "灰烬监军·烬卫",
      description: "守序、克制的重剑监军：先把节拍拉长，架势受压后会持续缩短玩家的犹豫空间。",
      phases: [
        {
          id: "measure",
          name: "I · 戒律试探",
          description: "用长前摇和高位落点测试玩家会不会过早出手。",
          postureThreshold: 0,
          accentColor: "#c98744",
          patternIds: ["delayed", "overhead"]
        },
        {
          id: "pressure",
          name: "II · 催令压拍",
          description: "连段与悬印交替出现，回合间的喘息被明显压缩。",
          postureThreshold: 50,
          accentColor: "#e66b33",
          patternIds: ["triple", "cinder-verdict"]
        },
        {
          id: "verdict",
          name: "III · 焚决追击",
          description: "以停顿误导和沉重裁决逼迫玩家坚持读完最后一拍。",
          postureThreshold: 75,
          accentColor: "#ff4f2e",
          patternIds: ["deceptive-pause", "cinder-verdict"]
        }
      ]
    },
    "mist-raven": {
      name: "雾鸦舞姬·折羽",
      description: "轻佻、游移的舞者：她用横移与假停顿遮住真正落点，专门惩罚只盯着单一方向的玩家。",
      phases: [
        {
          id: "skim",
          name: "I · 试羽掠影",
          description: "以 S 形接近和假慢刀收集玩家的提前输入。",
          postureThreshold: 0,
          accentColor: "#7fb2c7",
          patternIds: ["spiral-approach", "deceptive-pause"]
        },
        {
          id: "feint",
          name: "II · 折影换拍",
          description: "横掠、反折与三连变奏连续切换，要求重新确认最终方向。",
          postureThreshold: 50,
          accentColor: "#5a8bb5",
          patternIds: ["raven-whorl", "triple"]
        },
        {
          id: "roost",
          name: "III · 归巢断翼",
          description: "多次交错后突然收束，奖励能够稳定等到窗口出现的玩家。",
          postureThreshold: 75,
          accentColor: "#a26ab7",
          patternIds: ["ashina-flurry", "raven-whorl"]
        }
      ]
    },
    "iron-bell": {
      name: "铁钟守卫·鸣壁",
      description: "沉重、顽固的守卫：攻击像钟摆一样反复摆荡，阶段越高，落点越直接且越难拖延。",
      phases: [
        {
          id: "windup",
          name: "I · 钟前蓄压",
          description: "大幅摆动与缓慢抬升建立稳定节拍，先练习不被气势催促。",
          postureThreshold: 0,
          accentColor: "#9d8e71",
          patternIds: ["overhead", "delayed"]
        },
        {
          id: "resonance",
          name: "II · 震响连落",
          description: "钟摆落点和连段压拍轮换，要求在人类反应时间内保留确认余量。",
          postureThreshold: 50,
          accentColor: "#c78945",
          patternIds: ["bell-crush", "triple"]
        },
        {
          id: "shatter",
          name: "III · 碎钟绝拍",
          description: "重复摆荡后突然收束，不让玩家仅凭上一拍的节奏惯性出手。",
          postureThreshold: 75,
          accentColor: "#d85e36",
          patternIds: ["ashina-flurry", "bell-crush"]
        }
      ]
    }
  });

  return Object.freeze({
    ENEMY_POSITION: ENEMY_POSITION,
    PLAYER_POSITION: PLAYER_POSITION,
    ATTACK_PATTERNS: ATTACK_PATTERNS,
    BOSS_LIBRARY: BOSS_LIBRARY
  });
}));
