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
      name: "延迟斩·蓄势落锋",
      description: "长前摇后快速落点，练习在最后一瞬读节奏。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "蓄势收锋",
      commitCueLeadMs: 420,
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
      commitCueLabel: "终结换拍",
      commitCueLeadMs: 400,
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
      commitCueLabel: "重心下落",
      commitCueLeadMs: 380,
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
      commitCueLabel: "S 线收束",
      commitCueLeadMs: 420,
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
      commitCueLabel: "慢刀落势",
      commitCueLeadMs: 450,
      segments: [
        { label: "超长慢刀", p0: ENEMY_POSITION, p1: { x: 300, y: 80 }, p2: { x: 480, y: 90 }, p3: { x: 500, y: 175 }, durationMs: 1500, easing: "linear" },
        { label: "空中迟滞", p0: { x: 500, y: 175 }, p1: { x: 520, y: 230 }, p2: { x: 455, y: 245 }, p3: { x: 455, y: 285 }, durationMs: 400, easing: "easeInCubic" },
        { label: "变光下劈", p0: { x: 455, y: 285 }, p1: { x: 420, y: 360 }, p2: { x: 335, y: 485 }, p3: PLAYER_POSITION, durationMs: 250, easing: "easeOutExpo" }
      ]
    },
    "cross-flurry": {
      name: "交错连斩·折返突袭",
      description: "交错折返后命中，练习识别多段曲线的最终方向。",
      kind: "NORMAL",
      parryWindowMs: 180,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "折返定势",
      commitCueLeadMs: 420,
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
      commitCueLabel: "悬印落定",
      commitCueLeadMs: 400,
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
      commitCueLabel: "折羽归线",
      commitCueLeadMs: 410,
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
      commitCueLabel: "钟摆归心",
      commitCueLeadMs: 400,
      segments: [
        { label: "钟摆", p0: ENEMY_POSITION, p1: { x: 480, y: 100 }, p2: { x: 460, y: 310 }, p3: { x: 300, y: 330 }, durationMs: 650, easing: "easeInOutSine" },
        { label: "坠响", p0: { x: 300, y: 330 }, p1: { x: 270, y: 410 }, p2: { x: 300, y: 520 }, p3: PLAYER_POSITION, durationMs: 220, easing: "easeInExpo" }
      ]
    },
    "heir-volley": {
      name: "弦雷·退步三响",
      description: "先退弦、再收步；练习在明确的弓弦承诺后处理快速收束。",
      kind: "NORMAL",
      parryWindowMs: 165,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "弦鸣定拍",
      commitCueLeadMs: 420,
      segments: [
        { label: "退弦", p0: ENEMY_POSITION, p1: { x: 430, y: 135 }, p2: { x: 485, y: 235 }, p3: { x: 415, y: 310 }, durationMs: 560, easing: "easeOutCubic" },
        { label: "三响收束", p0: { x: 415, y: 310 }, p1: { x: 345, y: 370 }, p2: { x: 305, y: 505 }, p3: PLAYER_POSITION, durationMs: 250, easing: "easeInExpo" }
      ]
    },
    "heir-counter": {
      name: "弦雷·压刃反切",
      description: "近身压拍后反向切入；练习在连续压力中等到真正的终结承诺。",
      kind: "NORMAL",
      parryWindowMs: 155,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "反切定势",
      commitCueLeadMs: 380,
      segments: [
        { label: "压刃", p0: ENEMY_POSITION, p1: { x: 180, y: 150 }, p2: { x: 470, y: 240 }, p3: { x: 390, y: 355 }, durationMs: 430, easing: "easeInOutSine" },
        { label: "回切", p0: { x: 390, y: 355 }, p1: { x: 315, y: 455 }, p2: { x: 255, y: 410 }, p3: { x: 275, y: 485 }, durationMs: 260, easing: "easeInQuad" },
        { label: "落雷", p0: { x: 275, y: 485 }, p1: { x: 300, y: 510 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 140, easing: "easeOutExpo" }
      ]
    },
    "silk-weave": {
      name: "绢影·高索织步",
      description: "高位游移不断改写方向；练习不被优雅横移诱导到过早按键。",
      kind: "NORMAL",
      parryWindowMs: 175,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "丝线绷直",
      commitCueLeadMs: 410,
      segments: [
        { label: "织步", p0: ENEMY_POSITION, p1: { x: 100, y: 205 }, p2: { x: 520, y: 175 }, p3: { x: 440, y: 305 }, durationMs: 700, easing: "easeInOutSine" },
        { label: "垂丝", p0: { x: 440, y: 305 }, p1: { x: 400, y: 385 }, p2: { x: 330, y: 490 }, p3: PLAYER_POSITION, durationMs: 220, easing: "easeInExpo" }
      ]
    },
    "silk-dive": {
      name: "绢影·坠针回环",
      description: "先向外侧坠落再回环刺入；练习识别回环后的最终方向。",
      kind: "NORMAL",
      parryWindowMs: 160,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "坠针转向",
      commitCueLeadMs: 390,
      segments: [
        { label: "坠针", p0: ENEMY_POSITION, p1: { x: 520, y: 205 }, p2: { x: 465, y: 355 }, p3: { x: 360, y: 410 }, durationMs: 470, easing: "easeInCubic" },
        { label: "回环", p0: { x: 360, y: 410 }, p1: { x: 175, y: 355 }, p2: { x: 175, y: 510 }, p3: { x: 270, y: 505 }, durationMs: 330, easing: "easeInOutSine" },
        { label: "归针", p0: { x: 270, y: 505 }, p1: { x: 290, y: 525 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 130, easing: "easeOutExpo" }
      ]
    },
    "maestro-brushbeat": {
      name: "朱绘·指挥落笔",
      description: "像拍点一样分段落笔；练习把视觉节拍与最后一笔分开判断。",
      kind: "NORMAL",
      parryWindowMs: 190,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "落笔起拍",
      commitCueLeadMs: 450,
      segments: [
        { label: "提笔", p0: ENEMY_POSITION, p1: { x: 210, y: 105 }, p2: { x: 450, y: 210 }, p3: { x: 375, y: 285 }, durationMs: 620, easing: "easeOutCubic" },
        { label: "顿笔", p0: { x: 375, y: 285 }, p1: { x: 340, y: 310 }, p2: { x: 340, y: 390 }, p3: { x: 335, y: 420 }, durationMs: 260, easing: "slowFastPause" },
        { label: "收笔", p0: { x: 335, y: 420 }, p1: { x: 325, y: 475 }, p2: { x: 305, y: 525 }, p3: PLAYER_POSITION, durationMs: 210, easing: "easeInExpo" }
      ]
    },
    "maestro-erasure": {
      name: "朱绘·抹消回折",
      description: "大幅横抹后故意停笔；练习在画面静止时不抢先输入。",
      kind: "NORMAL",
      parryWindowMs: 180,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "墨迹凝结",
      commitCueLeadMs: 430,
      segments: [
        { label: "横抹", p0: ENEMY_POSITION, p1: { x: 520, y: 135 }, p2: { x: 475, y: 315 }, p3: { x: 245, y: 350 }, durationMs: 620, easing: "easeInOutSine" },
        { label: "凝墨", p0: { x: 245, y: 350 }, p1: { x: 220, y: 375 }, p2: { x: 245, y: 405 }, p3: { x: 255, y: 430 }, durationMs: 260, easing: "easeInCubic" },
        { label: "抹消", p0: { x: 255, y: 430 }, p1: { x: 270, y: 490 }, p2: { x: 300, y: 525 }, p3: PLAYER_POSITION, durationMs: 180, easing: "easeOutExpo" }
      ]
    },
    "diviner-tide": {
      name: "镜潮·折光涌线",
      description: "波纹先向外扩散再朝中心回卷；练习在回卷前确认方向。",
      kind: "NORMAL",
      parryWindowMs: 170,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "镜潮回涌",
      commitCueLeadMs: 400,
      segments: [
        { label: "折光", p0: ENEMY_POSITION, p1: { x: 500, y: 180 }, p2: { x: 105, y: 245 }, p3: { x: 175, y: 360 }, durationMs: 550, easing: "easeInOutSine" },
        { label: "回潮", p0: { x: 175, y: 360 }, p1: { x: 240, y: 465 }, p2: { x: 280, y: 505 }, p3: PLAYER_POSITION, durationMs: 250, easing: "easeInExpo" }
      ]
    },
    "diviner-echo": {
      name: "镜潮·余响双拍",
      description: "前一拍故意擦身而过，第二拍才真正收束；练习不把视觉噪音当作判定。",
      kind: "NORMAL",
      parryWindowMs: 185,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "余响合拍",
      commitCueLeadMs: 440,
      segments: [
        { label: "虚响", p0: ENEMY_POSITION, p1: { x: 145, y: 235 }, p2: { x: 460, y: 330 }, p3: { x: 405, y: 405 }, durationMs: 510, easing: "easeOutCubic" },
        { label: "折返", p0: { x: 405, y: 405 }, p1: { x: 355, y: 360 }, p2: { x: 220, y: 455 }, p3: { x: 270, y: 495 }, durationMs: 290, easing: "easeInQuad" },
        { label: "合拍", p0: { x: 270, y: 495 }, p1: { x: 285, y: 525 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 160, easing: "easeOutExpo" }
      ]
    },
    "garden-lowline": {
      name: "青藤·贴地扫步",
      description: "低位压步后突然上挑；练习用身体节拍而不是单看剑锋高度。",
      kind: "NORMAL",
      parryWindowMs: 175,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "踏步收胯",
      commitCueLeadMs: 410,
      segments: [
        { label: "贴地", p0: ENEMY_POSITION, p1: { x: 180, y: 325 }, p2: { x: 480, y: 420 }, p3: { x: 420, y: 470 }, durationMs: 490, easing: "easeInQuad" },
        { label: "上挑", p0: { x: 420, y: 470 }, p1: { x: 370, y: 455 }, p2: { x: 325, y: 525 }, p3: PLAYER_POSITION, durationMs: 210, easing: "easeOutExpo" }
      ]
    },
    "garden-elbowturn": {
      name: "青藤·肘转连逼",
      description: "短促转身接连逼近；练习在近距离节奏里保留一拍确认。",
      kind: "NORMAL",
      parryWindowMs: 160,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "转胯发力",
      commitCueLeadMs: 400,
      segments: [
        { label: "切步", p0: ENEMY_POSITION, p1: { x: 430, y: 220 }, p2: { x: 210, y: 295 }, p3: { x: 255, y: 390 }, durationMs: 380, easing: "easeInOutSine" },
        { label: "肘转", p0: { x: 255, y: 390 }, p1: { x: 320, y: 385 }, p2: { x: 375, y: 450 }, p3: { x: 330, y: 490 }, durationMs: 250, easing: "easeInQuad" },
        { label: "直逼", p0: { x: 330, y: 490 }, p1: { x: 315, y: 520 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 130, easing: "easeInExpo" }
      ]
    },
    "gallery-ribbon": {
      name: "白纱·双刃缎带",
      description: "双刃像缎带横扫，先展示姿态再给出收束；练习看懂旋转的结束点。",
      kind: "NORMAL",
      parryWindowMs: 180,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "缎带收圈",
      commitCueLeadMs: 430,
      segments: [
        { label: "展纱", p0: ENEMY_POSITION, p1: { x: 520, y: 105 }, p2: { x: 500, y: 365 }, p3: { x: 335, y: 390 }, durationMs: 590, easing: "easeInOutSine" },
        { label: "收圈", p0: { x: 335, y: 390 }, p1: { x: 200, y: 410 }, p2: { x: 265, y: 520 }, p3: PLAYER_POSITION, durationMs: 240, easing: "easeOutExpo" }
      ]
    },
    "gallery-cut": {
      name: "白纱·镜面断步",
      description: "旋转中突然停步反向；练习不把舞步的中段当成最终节拍。",
      kind: "NORMAL",
      parryWindowMs: 165,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "停步转刃",
      commitCueLeadMs: 385,
      segments: [
        { label: "旋进", p0: ENEMY_POSITION, p1: { x: 105, y: 175 }, p2: { x: 495, y: 300 }, p3: { x: 435, y: 405 }, durationMs: 470, easing: "easeInOutSine" },
        { label: "断步", p0: { x: 435, y: 405 }, p1: { x: 380, y: 415 }, p2: { x: 235, y: 395 }, p3: { x: 250, y: 490 }, durationMs: 270, easing: "slowFastPause" },
        { label: "镜切", p0: { x: 250, y: 490 }, p1: { x: 275, y: 520 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 150, easing: "easeInExpo" }
      ]
    },
    "regent-waltz": {
      name: "弦冠·机偶圆舞",
      description: "规整圆舞被突然的机械停顿切断；练习从重复里辨认真正的失衡点。",
      kind: "NORMAL",
      parryWindowMs: 180,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "发条卡止",
      commitCueLeadMs: 430,
      segments: [
        { label: "圆舞", p0: ENEMY_POSITION, p1: { x: 515, y: 170 }, p2: { x: 110, y: 285 }, p3: { x: 230, y: 395 }, durationMs: 650, easing: "easeInOutSine" },
        { label: "卡止", p0: { x: 230, y: 395 }, p1: { x: 250, y: 420 }, p2: { x: 270, y: 445 }, p3: { x: 280, y: 475 }, durationMs: 180, easing: "easeInCubic" },
        { label: "落幕", p0: { x: 280, y: 475 }, p1: { x: 290, y: 515 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 190, easing: "easeInExpo" }
      ]
    },
    "regent-redline": {
      name: "弦冠·红线疾走",
      description: "发条失控后快速越线；练习从慢圆舞切换到短促直线时重置节拍。",
      kind: "NORMAL",
      parryWindowMs: 155,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "红线亮起",
      commitCueLeadMs: 400,
      segments: [
        { label: "越线", p0: ENEMY_POSITION, p1: { x: 145, y: 240 }, p2: { x: 480, y: 290 }, p3: { x: 405, y: 435 }, durationMs: 420, easing: "easeOutCubic" },
        { label: "疾走", p0: { x: 405, y: 435 }, p1: { x: 355, y: 470 }, p2: { x: 315, y: 525 }, p3: PLAYER_POSITION, durationMs: 170, easing: "easeInExpo" }
      ]
    },
    "penitent-charge": {
      name: "银棘·蓄电折返",
      description: "电荷在外侧蓄积后折返；练习把亮起的蓄电当作预读承诺。",
      kind: "NORMAL",
      parryWindowMs: 175,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "电弧闭合",
      commitCueLeadMs: 440,
      segments: [
        { label: "蓄电", p0: ENEMY_POSITION, p1: { x: 480, y: 180 }, p2: { x: 500, y: 310 }, p3: { x: 395, y: 365 }, durationMs: 580, easing: "easeInCubic" },
        { label: "折返", p0: { x: 395, y: 365 }, p1: { x: 250, y: 365 }, p2: { x: 270, y: 505 }, p3: PLAYER_POSITION, durationMs: 260, easing: "easeOutExpo" }
      ]
    },
    "penitent-fall": {
      name: "银棘·雷铠坠庭",
      description: "高位电弧垂落；练习在强视觉特效中仍等到落点前的最后确认。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "雷铠下压",
      commitCueLeadMs: 390,
      segments: [
        { label: "升弧", p0: ENEMY_POSITION, p1: { x: 330, y: 35 }, p2: { x: 490, y: 150 }, p3: { x: 415, y: 255 }, durationMs: 520, easing: "easeOutCubic" },
        { label: "雷坠", p0: { x: 415, y: 255 }, p1: { x: 390, y: 395 }, p2: { x: 315, y: 520 }, p3: PLAYER_POSITION, durationMs: 210, easing: "easeInExpo" }
      ]
    },
    "jailer-lattice": {
      name: "锁环·格栅封线",
      description: "横纵格栅依次封路；练习在高压视觉密度中寻找唯一的终结方向。",
      kind: "NORMAL",
      parryWindowMs: 170,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "锁环闭合",
      commitCueLeadMs: 410,
      segments: [
        { label: "横栅", p0: ENEMY_POSITION, p1: { x: 520, y: 160 }, p2: { x: 120, y: 260 }, p3: { x: 205, y: 355 }, durationMs: 450, easing: "easeInOutSine" },
        { label: "纵栅", p0: { x: 205, y: 355 }, p1: { x: 420, y: 390 }, p2: { x: 395, y: 455 }, p3: { x: 330, y: 485 }, durationMs: 300, easing: "easeInQuad" },
        { label: "闭线", p0: { x: 330, y: 485 }, p1: { x: 315, y: 520 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 150, easing: "easeInExpo" }
      ]
    },
    "jailer-breakline": {
      name: "锁环·断链直入",
      description: "格栅突然断开并直入中心；练习在节拍停顿后迅速转换判断。",
      kind: "NORMAL",
      parryWindowMs: 160,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "断链响起",
      commitCueLeadMs: 400,
      segments: [
        { label: "锁止", p0: ENEMY_POSITION, p1: { x: 170, y: 185 }, p2: { x: 450, y: 340 }, p3: { x: 390, y: 405 }, durationMs: 410, easing: "slowFastPause" },
        { label: "直入", p0: { x: 390, y: 405 }, p1: { x: 345, y: 470 }, p2: { x: 315, y: 525 }, p3: PLAYER_POSITION, durationMs: 190, easing: "easeInExpo" }
      ]
    },
    "courier-flicker": {
      name: "零线·闪步递刃",
      description: "连续闪步把真正节拍藏在最后一次落脚；练习观察落脚而非追逐残影。",
      kind: "NORMAL",
      parryWindowMs: 165,
      damage: 25,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "落脚定线",
      commitCueLeadMs: 400,
      segments: [
        { label: "闪步一", p0: ENEMY_POSITION, p1: { x: 490, y: 185 }, p2: { x: 125, y: 250 }, p3: { x: 230, y: 335 }, durationMs: 310, easing: "easeOutExpo" },
        { label: "闪步二", p0: { x: 230, y: 335 }, p1: { x: 455, y: 335 }, p2: { x: 430, y: 445 }, p3: { x: 330, y: 475 }, durationMs: 270, easing: "easeOutExpo" },
        { label: "递刃", p0: { x: 330, y: 475 }, p1: { x: 315, y: 515 }, p2: { x: 300, y: 545 }, p3: PLAYER_POSITION, durationMs: 140, easing: "easeInExpo" }
      ]
    },
    "courier-razorloop": {
      name: "零线·刃环反送",
      description: "高速绕行后反送一击；练习在移动很快时仍保留最后一拍的确认。",
      kind: "NORMAL",
      parryWindowMs: 150,
      damage: 30,
      postureGain: 25,
      playerHurtboxRadius: PLAYER_HURTBOX_RADIUS,
      commitCueLabel: "刃环收束",
      commitCueLeadMs: 400,
      segments: [
        { label: "绕行", p0: ENEMY_POSITION, p1: { x: 85, y: 205 }, p2: { x: 500, y: 345 }, p3: { x: 425, y: 430 }, durationMs: 400, easing: "easeInOutSine" },
        { label: "反送", p0: { x: 425, y: 430 }, p1: { x: 350, y: 465 }, p2: { x: 315, y: 525 }, p3: PLAYER_POSITION, durationMs: 170, easing: "easeInExpo" }
      ]
    }
  });

  const BOSS_VISUAL_MOTIFS = Object.freeze({
    "cinder-warden": Object.freeze({ type: "ember-seal", label: "烬印律令" }),
    "mist-raven": Object.freeze({ type: "feather-whorl", label: "鸦羽残影" }),
    "iron-bell": Object.freeze({ type: "bell-ripple", label: "钟摆回响" }),
    "storm-heir": Object.freeze({ type: "string-volley", label: "弦雷定拍" }),
    "silk-phantom": Object.freeze({ type: "silk-weave", label: "绢影织步" }),
    "painted-maestro": Object.freeze({ type: "brush-score", label: "朱绘节拍" }),
    "mirror-diviner": Object.freeze({ type: "mirror-tide", label: "镜潮回声" }),
    "garden-striker": Object.freeze({ type: "stance-line", label: "庭院重心" }),
    "gallery-dancer": Object.freeze({ type: "twin-ribbon", label: "双刃缎带" }),
    "clockwork-regent": Object.freeze({ type: "clockwork-wheel", label: "发条圆舞" }),
    "storm-penitent": Object.freeze({ type: "thunder-fall", label: "雷铠蓄势" }),
    "neon-jailer": Object.freeze({ type: "neon-lattice", label: "格栅封线" }),
    "edge-courier": Object.freeze({ type: "afterimage-step", label: "零线残步" })
  });

  function withBossPacing(bosses) {
    Object.keys(bosses).forEach(function (bossKey) {
      const boss = bosses[bossKey];
      const motif = BOSS_VISUAL_MOTIFS[bossKey];
      boss.visualMotif = { type: motif.type, label: motif.label };
      boss.phases.forEach(function (phase, phaseIndex) {
        if (!Number.isFinite(phase.postureGainScale)) phase.postureGainScale = phaseIndex === 0 ? 1 : 0.5;
      });
    });
    return bosses;
  }

  const BOSS_LIBRARY = Object.freeze(withBossPacing({
    "cinder-warden": {
      name: "灰烬监军·烬卫",
      description: "守序、克制的重剑监军：先把节拍拉长，架势受压后会持续缩短玩家的犹豫空间。",
      inspiration: {
        kind: "blade-trace-original",
        sourceGame: "BladeTrace",
        lesson: "用长前摇、压拍和沉重收束训练稳定的节奏确认。"
      },
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
      inspiration: {
        kind: "blade-trace-original",
        sourceGame: "BladeTrace",
        lesson: "用横移、停顿与反折训练对最终方向的辨认。"
      },
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
          patternIds: ["cross-flurry", "raven-whorl"]
        }
      ]
    },
    "iron-bell": {
      name: "铁钟守卫·鸣壁",
      description: "沉重、顽固的守卫：攻击像钟摆一样反复摆荡，阶段越高，落点越直接且越难拖延。",
      inspiration: {
        kind: "blade-trace-original",
        sourceGame: "BladeTrace",
        lesson: "用钟摆与骤停训练从大幅动作中抽取最后一拍。"
      },
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
          patternIds: ["cross-flurry", "bell-crush"]
        }
      ]
    },
    "storm-heir": {
      name: "雷弦继承者·玄岚",
      description: "自信、咄咄逼人的弦刃斗士：以退步蓄势诱导追击，再用近身反切强迫玩家在压力中回拍。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Sekiro: Shadows Die Twice",
        lesson: "致敬贴身刀弓压迫、清晰承诺和连续弹反的学习节奏；不使用原作角色或素材。"
      },
      phases: [
        { id: "string-test", name: "I · 弦试", description: "先用后撤与长前摇确认玩家是否会追着节奏出手。", postureThreshold: 0, accentColor: "#6d9ad1", patternIds: ["heir-volley", "delayed"] },
        { id: "close-pressure", name: "II · 逼城", description: "反切与连段贴近，要求把第一阶段的耐心带进连续压力。", postureThreshold: 50, accentColor: "#7287d6", patternIds: ["heir-counter", "triple"] },
        { id: "storm-answer", name: "III · 惊雷", description: "弓弦承诺和反切交替，奖励能在速度上升时仍读到最后一拍的玩家。", postureThreshold: 75, accentColor: "#a8b4ff", patternIds: ["heir-volley", "heir-counter"] }
      ]
    },
    "silk-phantom": {
      name: "绢影宗师·蝶钗",
      description: "优雅、戏谑的高索舞者：她把横移和回环织成幻象，只在最后才交出真实落点。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Sekiro: Shadows Die Twice",
        lesson: "致敬高机动幻象、二段欺骗和识别落点的学习感；不使用原作角色或素材。"
      },
      phases: [
        { id: "thread", name: "I · 悬丝", description: "高索织步与停顿慢刀建立“好看但不可抢按”的基本规则。", postureThreshold: 0, accentColor: "#9f7bc5", patternIds: ["silk-weave", "deceptive-pause"] },
        { id: "shadow", name: "II · 蝶影", description: "回环坠针取代单纯停顿，要求重新确认终点会从哪一侧归来。", postureThreshold: 50, accentColor: "#bd79be", patternIds: ["silk-dive", "raven-whorl"] },
        { id: "fall", name: "III · 幻落", description: "织步与坠针交错，让玩家把视线锁在收束而不是舞步。", postureThreshold: 75, accentColor: "#db93de", patternIds: ["silk-weave", "silk-dive"] }
      ]
    },
    "painted-maestro": {
      name: "朱绘指挥·暮颜",
      description: "庄严、克制的画面编排者：每一次停笔都像给玩家留题，而最后一笔才是答案。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Clair Obscur: Expedition 33",
        lesson: "致敬把回合节拍、演出承诺和实时招架结合的阅读体验；不使用原作角色或素材。"
      },
      phases: [
        { id: "opening-stroke", name: "I · 起笔", description: "提笔、顿笔、收笔分明，先让玩家学会把演出节拍拆开。", postureThreshold: 0, accentColor: "#be6a5e", patternIds: ["maestro-brushbeat", "delayed"] },
        { id: "held-stroke", name: "II · 停笔", description: "横抹后凝墨，专门检查玩家是否把静止错误当成可弹反瞬间。", postureThreshold: 50, accentColor: "#d17859", patternIds: ["maestro-erasure", "deceptive-pause"] },
        { id: "erasure", name: "III · 抹消", description: "两种笔势轮换，要求在完整表演结束前保持对最后一笔的判断。", postureThreshold: 75, accentColor: "#e49c69", patternIds: ["maestro-brushbeat", "maestro-erasure"] }
      ]
    },
    "mirror-diviner": {
      name: "镜潮预言者·澜祷",
      description: "温柔、疏离的镜面占卜师：攻击像水纹传播，真实意图总在回声之后才显形。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Clair Obscur: Expedition 33",
        lesson: "致敬视觉节拍、回声欺骗与可无伤学习的招架反馈；不使用原作角色或素材。"
      },
      phases: [
        { id: "reflection", name: "I · 映潮", description: "折光后回潮，先练习不把第一条水纹当成最终命中。", postureThreshold: 0, accentColor: "#65a9b4", patternIds: ["diviner-tide", "delayed"] },
        { id: "echo", name: "II · 回声", description: "虚响与反折增加一层记忆负担，要求等待真正的合拍信号。", postureThreshold: 50, accentColor: "#4d8fb0", patternIds: ["diviner-echo", "raven-whorl"] },
        { id: "shatter", name: "III · 镜断", description: "潮汐与回声交替，最终考验玩家能否从漂亮的轨迹中筛出承诺。", postureThreshold: 75, accentColor: "#6bc8cc", patternIds: ["diviner-tide", "diviner-echo"] }
      ]
    },
    "garden-striker": {
      name: "庭院斗师·青藤",
      description: "直接、凶狠的近身格斗家：重心变化比剑锋更重要，节拍短但绝不无理。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Sifu",
        lesson: "致敬贴身武术的高低转换、姿态承诺和短回合学习；不使用原作角色或素材。"
      },
      phases: [
        { id: "root", name: "I · 扎根", description: "贴地扫步和直线落点先让玩家读懂下盘蓄力。", postureThreshold: 0, accentColor: "#718e5c", patternIds: ["garden-lowline", "overhead"] },
        { id: "turn", name: "II · 转胯", description: "肘转连逼缩短近身确认余量，但仍保留明确的发力信号。", postureThreshold: 50, accentColor: "#809e4f", patternIds: ["garden-elbowturn", "triple"] },
        { id: "climb", name: "III · 攀藤", description: "扫步与肘转切换，要求玩家从重心而非速度猜测出手。", postureThreshold: 75, accentColor: "#a1bd60", patternIds: ["garden-lowline", "garden-elbowturn"] }
      ]
    },
    "gallery-dancer": {
      name: "展厅双刃·白纱",
      description: "冷艳、克制的双刃舞者：动作像展示品般完美，却会在观众放松时反向断拍。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Sifu",
        lesson: "致敬姿态切换、旋转节拍和中途停步带来的读招压力；不使用原作角色或素材。"
      },
      phases: [
        { id: "display", name: "I · 展纱", description: "双刃缎带先建立完整旋转的阅读规则。", postureThreshold: 0, accentColor: "#c8c2bb", patternIds: ["gallery-ribbon", "delayed"] },
        { id: "fracture", name: "II · 断步", description: "镜面断步开始改写旋转节奏，要求玩家停止跟着视觉惯性抢按。", postureThreshold: 50, accentColor: "#a89da8", patternIds: ["gallery-cut", "raven-whorl"] },
        { id: "finale", name: "III · 落幕", description: "展纱与断步并置，玩家必须在优雅动作结束前识别真正收圈。", postureThreshold: 75, accentColor: "#e4d5cc", patternIds: ["gallery-ribbon", "gallery-cut"] }
      ]
    },
    "clockwork-regent": {
      name: "机偶摄政·弦冠",
      description: "傲慢、戏剧化的发条统治者：圆舞的重复会制造安全感，而失控的红线专门撕碎它。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Lies of P",
        lesson: "致敬机械舞步、二阶段失控与由慢转快的守卫学习；不使用原作角色或素材。"
      },
      phases: [
        { id: "waltz", name: "I · 圆舞", description: "规整圆舞与卡止建立可背诵的机械节拍。", postureThreshold: 0, accentColor: "#a46e75", patternIds: ["regent-waltz", "delayed"] },
        { id: "redline", name: "II · 红线", description: "发条脱离节奏后，短直线迫使玩家放弃第一阶段的慢拍记忆。", postureThreshold: 50, accentColor: "#c44d58", patternIds: ["regent-redline", "triple"] },
        { id: "unbound", name: "III · 失控", description: "圆舞与疾走并置，奖励能在节奏突然失衡时重建预判的人。", postureThreshold: 75, accentColor: "#e76a6f", patternIds: ["regent-waltz", "regent-redline"] }
      ]
    },
    "storm-penitent": {
      name: "雷铠悔徒·银棘",
      description: "肃穆、炽烈的重甲战士：电弧不是装饰，而是她每一次承诺会落下的宣言。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Lies of P",
        lesson: "致敬高风险充能、显性视觉承诺和由重到快的招架挑战；不使用原作角色或素材。"
      },
      phases: [
        { id: "charge", name: "I · 蓄电", description: "先把外侧蓄电读成即将折返的可靠信号。", postureThreshold: 0, accentColor: "#90aee8", patternIds: ["penitent-charge", "overhead"] },
        { id: "fall", name: "II · 雷坠", description: "高位雷铠缩短终结段，要求玩家在强视觉下守住确认时机。", postureThreshold: 50, accentColor: "#b7ccff", patternIds: ["penitent-fall", "triple"] },
        { id: "absolution", name: "III · 赎雷", description: "蓄电折返与雷坠轮换，测试玩家是否真正把信号当作节拍而非特效。", postureThreshold: 75, accentColor: "#e0e9ff", patternIds: ["penitent-charge", "penitent-fall"] }
      ]
    },
    "neon-jailer": {
      name: "霓虹狱长·锁环",
      description: "冷酷、精确的竞技场看守：他用格栅把空间切成节拍，再在断链时直刺核心。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Furi",
        lesson: "致敬高压竞技场、图案化弹幕节拍和近战收束之间的切换；不使用原作角色或素材。"
      },
      phases: [
        { id: "grid", name: "I · 格栅", description: "横纵封线先训练玩家从复杂路径中找到唯一收束。", postureThreshold: 0, accentColor: "#3fbdc9", patternIds: ["jailer-lattice", "delayed"] },
        { id: "break", name: "II · 断链", description: "停顿后的直入打破格栅节奏，要求重置对速度的预期。", postureThreshold: 50, accentColor: "#48e0d5", patternIds: ["jailer-breakline", "triple"] },
        { id: "lockdown", name: "III · 封场", description: "封线与直入组合，考验玩家能否把图案记忆转化为最后一拍判断。", postureThreshold: 75, accentColor: "#7af6d9", patternIds: ["jailer-lattice", "jailer-breakline"] }
      ]
    },
    "edge-courier": {
      name: "极锋信使·零线",
      description: "急躁、挑衅的高速信使：残影只负责制造噪音，真正的攻击总来自最后一次落脚。",
      inspiration: {
        kind: "mechanical-homage",
        sourceGame: "Furi",
        lesson: "致敬高速换位、短招回合与由移动路径读出终结意图的挑战；不使用原作角色或素材。"
      },
      phases: [
        { id: "flicker", name: "I · 闪步", description: "先识别两次闪步里真正决定方向的最后落脚。", postureThreshold: 0, accentColor: "#d36b9a", patternIds: ["courier-flicker", "delayed"] },
        { id: "loop", name: "II · 刃环", description: "绕行反送缩短确认空间，要求不追逐残影而等候收束。", postureThreshold: 50, accentColor: "#ee4f7d", patternIds: ["courier-razorloop", "triple"] },
        { id: "zero", name: "III · 零线", description: "闪步与刃环连续交替，奖励能在高速视觉中保留节拍锚点的玩家。", postureThreshold: 75, accentColor: "#ff98b7", patternIds: ["courier-flicker", "courier-razorloop"] }
      ]
    }
  }));

  return Object.freeze({
    ENEMY_POSITION: ENEMY_POSITION,
    PLAYER_POSITION: PLAYER_POSITION,
    ATTACK_PATTERNS: ATTACK_PATTERNS,
    BOSS_LIBRARY: BOSS_LIBRARY
  });
}));
