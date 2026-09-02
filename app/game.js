"use strict";

const COMBAT_STATE = Object.freeze({
  IDLE: "IDLE",
  ATTACKING: "ATTACKING",
  PARRY_BOUNCE: "PARRY_BOUNCE",
  DEATHBLOW: "DEATHBLOW",
  VICTORY: "VICTORY",
  DEFEATED: "DEFEATED"
});

const ENEMY_POSITION = Object.freeze({ x: 300, y: 100 });
const PLAYER_POSITION = Object.freeze({ x: 300, y: 570 });
const MAX_VALUE = 100;
const PLAYER_HURTBOX_DEFAULT_RADIUS = 25;
const PARRY_WINDOW_DEFAULT_MS = 150;

const EASINGS = Object.freeze({
  linear: function (t) { return t; },
  easeInQuad: function (t) { return t * t; },
  easeInCubic: function (t) { return t * t * t; },
  easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
  easeInExpo: function (t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); },
  easeOutExpo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
  slowFastPause: function (t) {
    return t < 0.5 ? 2 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cubicBezier(p0, p1, p2, p3, t) {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;

  return {
    x: inverseSquared * inverse * p0.x + 3 * inverseSquared * t * p1.x + 3 * inverse * tSquared * p2.x + tSquared * t * p3.x,
    y: inverseSquared * inverse * p0.y + 3 * inverseSquared * t * p1.y + 3 * inverse * tSquared * p2.y + tSquared * t * p3.y
  };
}

class AudioEngine {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.isSupported = Boolean(window.AudioContext || window.webkitAudioContext);
  }

  getContext() {
    if (!this.enabled || !this.isSupported) return null;

    try {
      if (!this.context) {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextConstructor();
      }
      if (this.context.state === "suspended") {
        this.context.resume().catch(function () {});
      }
      return this.context;
    } catch (error) {
      this.enabled = false;
      return null;
    }
  }

  playDeflect() {
    const context = this.getContext();
    if (!context) return;

    const now = context.currentTime;
    this.playOscillator(context, "triangle", 1400, 380, 0.8, 0.2, now);
    this.playOscillator(context, "sine", 2800, 1600, 0.35, 0.38, now);
  }

  playHit() {
    const context = this.getContext();
    if (!context) return;
    this.playOscillator(context, "sawtooth", 180, 40, 0.7, 0.25, context.currentTime);
  }

  playDeathblow() {
    const context = this.getContext();
    if (!context) return;
    this.playOscillator(context, "square", 120, 30, 0.9, 0.6, context.currentTime);
  }

  playOscillator(context, type, startFrequency, endFrequency, gainValue, duration, now) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  clear() {
    this.particles = [];
  }

  spawnSparks(x, y, count) {
    const particleCount = count || 30;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.09 + Math.random() * 0.22;
      const lifeMs = 320 + Math.random() * 420;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: lifeMs,
        maxLifeMs: lifeMs,
        size: 1.5 + Math.random() * 3.5,
        color: Math.random() > 0.32 ? "#ffcc00" : "#ff542e"
      });
    }
  }

  update(deltaMs) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.x += particle.vx * deltaMs;
      particle.y += particle.vy * deltaMs;
      particle.lifeMs -= deltaMs;
      if (particle.lifeMs <= 0) this.particles.splice(index, 1);
    }
  }

  draw(context) {
    context.save();
    this.particles.forEach(function (particle) {
      context.globalAlpha = clamp(particle.lifeMs / particle.maxLifeMs, 0, 1);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }
}

const ATTACK_PATTERNS = Object.freeze({
  delayed: {
    name: "苇名流·延迟斩",
    parryWindowMs: 150,
    damage: 25,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "蓄力前摇", p0: ENEMY_POSITION, p1: { x: 120, y: 150 }, p2: { x: 80, y: 300 }, p3: { x: 150, y: 380 }, durationMs: 900, easing: "easeOutCubic" },
      { label: "骤降斩击", p0: { x: 150, y: 380 }, p1: { x: 200, y: 440 }, p2: { x: 280, y: 520 }, p3: PLAYER_POSITION, durationMs: 220, easing: "easeInExpo" }
    ]
  },
  triple: {
    name: "三连斩·快速变奏",
    parryWindowMs: 150,
    damage: 25,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "一之型", p0: ENEMY_POSITION, p1: { x: 450, y: 180 }, p2: { x: 400, y: 350 }, p3: { x: 260, y: 420 }, durationMs: 500, easing: "easeOutCubic" },
      { label: "二之型", p0: { x: 260, y: 420 }, p1: { x: 100, y: 300 }, p2: { x: 150, y: 480 }, p3: { x: 280, y: 520 }, durationMs: 400, easing: "easeInOutSine" },
      { label: "终结型", p0: { x: 280, y: 520 }, p1: { x: 350, y: 450 }, p2: { x: 320, y: 540 }, p3: PLAYER_POSITION, durationMs: 180, easing: "easeInExpo" }
    ]
  },
  overhead: {
    name: "跳劈·极速下斩",
    parryWindowMs: 150,
    damage: 30,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "上挑蓄势", p0: ENEMY_POSITION, p1: { x: 300, y: 40 }, p2: { x: 200, y: 60 }, p3: { x: 200, y: 200 }, durationMs: 750, easing: "easeOutCubic" },
      { label: "极速下劈", p0: { x: 200, y: 200 }, p1: { x: 200, y: 350 }, p2: { x: 290, y: 480 }, p3: PLAYER_POSITION, durationMs: 160, easing: "easeInExpo" }
    ]
  },
  "spiral-thrust": {
    name: "螺旋突刺·S 形迷踪",
    parryWindowMs: 170,
    damage: 30,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "S 形迷踪", p0: ENEMY_POSITION, p1: { x: 90, y: 320 }, p2: { x: 450, y: 460 }, p3: { x: 445, y: 290 }, durationMs: 900, easing: "slowFastPause" },
      { label: "死角突刺", p0: { x: 445, y: 290 }, p1: { x: 485, y: 205 }, p2: { x: 365, y: 465 }, p3: PLAYER_POSITION, durationMs: 280, easing: "easeOutExpo" }
    ]
  },
  "deceptive-pause": {
    name: "伪装慢刀·迟滞暴击",
    parryWindowMs: 190,
    damage: 30,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "超长慢刀", p0: ENEMY_POSITION, p1: { x: 300, y: 80 }, p2: { x: 480, y: 90 }, p3: { x: 500, y: 175 }, durationMs: 1500, easing: "linear" },
      { label: "空中迟滞", p0: { x: 500, y: 175 }, p1: { x: 520, y: 230 }, p2: { x: 455, y: 245 }, p3: { x: 455, y: 285 }, durationMs: 400, easing: "easeInCubic" },
      { label: "变光下劈", p0: { x: 455, y: 285 }, p1: { x: 420, y: 360 }, p2: { x: 335, y: 485 }, p3: PLAYER_POSITION, durationMs: 250, easing: "easeOutExpo" }
    ]
  },
  "ashina-flurry": {
    name: "苇名连斩·交错突袭",
    parryWindowMs: 180,
    damage: 25,
    postureGain: 25,
    enemyDamage: 5,
    segments: [
      { label: "起势", p0: ENEMY_POSITION, p1: { x: 450, y: 230 }, p2: { x: 400, y: 120 }, p3: { x: 420, y: 250 }, durationMs: 500, easing: "easeInOutSine" },
      { label: "交错", p0: { x: 420, y: 250 }, p1: { x: 490, y: 425 }, p2: { x: 175, y: 310 }, p3: { x: 235, y: 420 }, durationMs: 400, easing: "easeInQuad" },
      { label: "终结", p0: { x: 235, y: 420 }, p1: { x: 265, y: 470 }, p2: { x: 300, y: 520 }, p3: PLAYER_POSITION, durationMs: 300, easing: "easeOutExpo" }
    ]
  }
});

const EDITOR_MIN_DURATION_MS = 50;
const EDITOR_MIN_PLAYER_HURTBOX_RADIUS = 12;
const EDITOR_MAX_PLAYER_HURTBOX_RADIUS = 160;
const EDITOR_MIN_PARRY_WINDOW_MS = 30;
const EDITOR_MAX_PARRY_WINDOW_MS = 1000;
const EASING_NAMES = Object.freeze(Object.keys(EASINGS));

function normalizePlayerHurtboxRadius(radius) {
  const numericRadius = Number(radius);
  const nextRadius = Number.isFinite(numericRadius) ? numericRadius : PLAYER_HURTBOX_DEFAULT_RADIUS;
  return clamp(Math.round(nextRadius), EDITOR_MIN_PLAYER_HURTBOX_RADIUS, EDITOR_MAX_PLAYER_HURTBOX_RADIUS);
}

function normalizeParryWindowMs(windowMs) {
  const numericWindowMs = Number(windowMs);
  const nextWindowMs = Number.isFinite(numericWindowMs) ? numericWindowMs : PARRY_WINDOW_DEFAULT_MS;
  return clamp(Math.round(nextWindowMs), EDITOR_MIN_PARRY_WINDOW_MS, EDITOR_MAX_PARRY_WINDOW_MS);
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneSegment(segment) {
  return {
    label: segment.label,
    p0: clonePoint(segment.p0),
    p1: clonePoint(segment.p1),
    p2: clonePoint(segment.p2),
    p3: clonePoint(segment.p3),
    durationMs: segment.durationMs,
    easing: segment.easing
  };
}

function clonePattern(pattern) {
  return {
    name: pattern.name,
    parryWindowMs: normalizeParryWindowMs(pattern.parryWindowMs),
    damage: pattern.damage,
    postureGain: pattern.postureGain,
    enemyDamage: pattern.enemyDamage,
    playerHurtboxRadius: normalizePlayerHurtboxRadius(pattern.playerHurtboxRadius),
    segments: pattern.segments.map(cloneSegment)
  };
}

function clonePatternLibrary(patterns) {
  const result = {};
  Object.keys(patterns).forEach(function (key) {
    result[key] = clonePattern(patterns[key]);
  });
  return result;
}

function interpolatePoint(first, second, progress) {
  return {
    x: first.x + (second.x - first.x) * progress,
    y: first.y + (second.y - first.y) * progress
  };
}

function splitBezierSegment(segment) {
  const firstControl = interpolatePoint(segment.p0, segment.p1, 0.5);
  const secondControl = interpolatePoint(segment.p1, segment.p2, 0.5);
  const thirdControl = interpolatePoint(segment.p2, segment.p3, 0.5);
  const firstInner = interpolatePoint(firstControl, secondControl, 0.5);
  const secondInner = interpolatePoint(secondControl, thirdControl, 0.5);
  const sharedAnchor = interpolatePoint(firstInner, secondInner, 0.5);
  const firstDuration = Math.max(EDITOR_MIN_DURATION_MS, Math.round(segment.durationMs / 2));
  const secondDuration = Math.max(EDITOR_MIN_DURATION_MS, segment.durationMs - firstDuration);
  const baseLabel = segment.label || "未命名段落";

  return [
    {
      label: baseLabel + " · 前段",
      p0: clonePoint(segment.p0),
      p1: firstControl,
      p2: firstInner,
      p3: clonePoint(sharedAnchor),
      durationMs: firstDuration,
      easing: segment.easing
    },
    {
      label: baseLabel + " · 后段",
      p0: clonePoint(sharedAnchor),
      p1: secondInner,
      p2: thirdControl,
      p3: clonePoint(segment.p3),
      durationMs: secondDuration,
      easing: segment.easing
    }
  ];
}

class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.context = this.canvas.getContext("2d");
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();

    this.state = COMBAT_STATE.IDLE;
    this.playerHp = MAX_VALUE;
    this.enemyHp = MAX_VALUE;
    this.enemyPosture = 0;
    this.patternLibrary = clonePatternLibrary(ATTACK_PATTERNS);
    this.originalPatternLibrary = clonePatternLibrary(ATTACK_PATTERNS);
    this.currentPatternKey = "delayed";
    this.currentPattern = this.patternLibrary[this.currentPatternKey];
    this.startTime = 0;
    this.elapsedMs = 0;
    this.totalDurationMs = 0;
    this.currentSegmentIndex = 0;
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.cursorTrail = [];
    this.bounce = null;
    this.screenShake = 0;
    this.lastFrameTime = 0;
    this.autoStartTimer = null;
    this.feedbackTimer = null;
    this.isEditorMode = false;
    this.selectedSegmentIndex = 0;
    this.draggedControl = null;

    this.initDom();
    this.bindEvents();
    this.resetCombat(false);
    window.requestAnimationFrame(this.loop.bind(this));
  }

  initDom() {
    this.enemyPostureBar = document.getElementById("enemy-posture-bar");
    this.enemyPostureText = document.getElementById("enemy-posture-text");
    this.enemyHpBar = document.getElementById("enemy-hp-bar");
    this.enemyHpText = document.getElementById("enemy-hp-text");
    this.playerHpBar = document.getElementById("player-hp-bar");
    this.playerHpText = document.getElementById("player-hp-text");
    this.playerStatus = document.getElementById("player-status");
    this.timingFeedback = document.getElementById("timing-feedback");
    this.windowIndicator = document.getElementById("window-indicator");
    this.deathblowOverlay = document.getElementById("deathblow-overlay");
    this.deathblowButton = document.getElementById("btn-deathblow");
    this.patternSelect = document.getElementById("pattern-select");
    this.windowSelect = document.getElementById("window-select");
    this.showWireframe = document.getElementById("show-wireframe");
    this.autoLoop = document.getElementById("auto-loop");
    this.soundToggle = document.getElementById("sound-toggle");
    this.attackButton = document.getElementById("btn-attack");
    this.parryButton = document.getElementById("btn-parry");
    this.resetButton = document.getElementById("btn-reset");
    this.editorEntryButton = document.getElementById("btn-editor");
    this.runtimeEditorBar = document.getElementById("runtime-editor-bar");
    this.runtimeEditorSelection = document.getElementById("runtime-editor-selection");
    this.runtimeEditorSplitButton = document.getElementById("btn-runtime-editor-split");
    this.runtimeEditorDeleteButton = document.getElementById("btn-runtime-editor-delete");
    this.runtimeEditorAdvancedButton = document.getElementById("btn-runtime-editor-advanced");
    this.runtimeEditorExitButton = document.getElementById("btn-runtime-editor-exit");
    this.editorPanel = document.getElementById("editor-panel");
    this.editorCloseButton = document.getElementById("btn-editor-close");
    this.editorPatternNameInput = document.getElementById("editor-pattern-name");
    this.editorSegmentList = document.getElementById("editor-segment-list");
    this.editorSelectionDescription = document.getElementById("editor-selection-description");
    this.editorSegmentNameInput = document.getElementById("editor-segment-name");
    this.editorDurationInput = document.getElementById("editor-duration");
    this.editorEasingSelect = document.getElementById("editor-easing");
    this.editorPointInputs = Array.from(document.querySelectorAll("[data-editor-point]"));
    this.editorHurtboxRadiusRange = document.getElementById("editor-hurtbox-radius");
    this.editorHurtboxRadiusInput = document.getElementById("editor-hurtbox-radius-number");
    this.editorHurtboxValue = document.getElementById("editor-hurtbox-value");
    this.editorParryWindowRange = document.getElementById("editor-parry-window");
    this.editorParryWindowInput = document.getElementById("editor-parry-window-number");
    this.editorParryWindowValue = document.getElementById("editor-parry-window-value");
    this.editorParryWindowStatus = document.getElementById("editor-parry-window-status");
    this.editorApplyPatternWindowButton = document.getElementById("btn-editor-use-pattern-window");
    this.editorAddSegmentButton = document.getElementById("btn-editor-add-segment");
    this.editorDeleteSegmentButton = document.getElementById("btn-editor-delete-segment");
    this.editorResetPatternButton = document.getElementById("btn-editor-reset-pattern");
    this.enemyPostureProgress = document.querySelector(".posture-outer");
    this.enemyHpProgress = document.querySelector(".enemy-hp-outer");
    this.playerHpProgress = document.querySelector(".hp-outer");
  }

  bindEvents() {
    this.attackButton.addEventListener("click", this.startAttack.bind(this));
    this.parryButton.addEventListener("click", this.handleParryInput.bind(this));
    this.resetButton.addEventListener("click", this.resetCombat.bind(this, true));
    this.deathblowButton.addEventListener("click", this.executeDeathblow.bind(this));

    this.patternSelect.addEventListener("change", this.handlePatternChange.bind(this));
    this.windowSelect.addEventListener("change", this.handleWindowChange.bind(this));
    this.soundToggle.addEventListener("change", this.handleSoundChange.bind(this));
    this.editorEntryButton.addEventListener("click", this.toggleEditorMode.bind(this));
    this.runtimeEditorSplitButton.addEventListener("click", this.addSegmentAfterSelection.bind(this));
    this.runtimeEditorDeleteButton.addEventListener("click", this.deleteSelectedSegment.bind(this));
    this.runtimeEditorAdvancedButton.addEventListener("click", this.toggleAdvancedEditorPanel.bind(this));
    this.runtimeEditorExitButton.addEventListener("click", this.exitEditorMode.bind(this));
    this.editorCloseButton.addEventListener("click", this.exitEditorMode.bind(this));
    this.editorPatternNameInput.addEventListener("input", this.handlePatternNameInput.bind(this));
    this.editorSegmentList.addEventListener("click", this.handleSegmentSelection.bind(this));
    this.editorSegmentNameInput.addEventListener("input", this.handleSegmentNameInput.bind(this));
    this.editorDurationInput.addEventListener("change", this.handleSegmentDurationInput.bind(this));
    this.editorEasingSelect.addEventListener("change", this.handleSegmentEasingChange.bind(this));
    this.editorPointInputs.forEach(function (input) {
      input.addEventListener("input", this.handlePointInput.bind(this));
    }.bind(this));
    this.editorHurtboxRadiusRange.addEventListener("input", this.handlePlayerHurtboxRadiusInput.bind(this));
    this.editorHurtboxRadiusInput.addEventListener("change", this.handlePlayerHurtboxRadiusInput.bind(this));
    this.editorParryWindowRange.addEventListener("input", this.handleParryWindowInput.bind(this));
    this.editorParryWindowInput.addEventListener("change", this.handleParryWindowInput.bind(this));
    this.editorApplyPatternWindowButton.addEventListener("click", this.applyPatternParryWindow.bind(this));
    this.editorAddSegmentButton.addEventListener("click", this.addSegmentAfterSelection.bind(this));
    this.editorDeleteSegmentButton.addEventListener("click", this.deleteSelectedSegment.bind(this));
    this.editorResetPatternButton.addEventListener("click", this.resetCurrentPatternEdits.bind(this));
    this.canvas.addEventListener("pointerdown", this.handleCanvasPointerDown.bind(this));
    this.canvas.addEventListener("pointermove", this.handleCanvasPointerMove.bind(this));
    this.canvas.addEventListener("pointerup", this.handleCanvasPointerUp.bind(this));
    this.canvas.addEventListener("pointercancel", this.handleCanvasPointerUp.bind(this));

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handlePatternChange(event) {
    const nextPattern = this.patternLibrary[event.target.value];
    if (!nextPattern || this.state !== COMBAT_STATE.IDLE) return;
    this.currentPatternKey = event.target.value;
    this.currentPattern = nextPattern;
    this.selectedSegmentIndex = 0;
    this.resetCombat(false);
    if (this.isEditorMode) {
      this.renderEditor();
      this.setStatus("正在编辑「" + this.currentPattern.name + "」", "neutral");
    } else {
      this.setStatus("已选择「" + this.currentPattern.name + "」", "neutral");
    }
  }

  handleSoundChange(event) {
    this.audio.enabled = event.target.checked;
    this.setStatus(event.target.checked ? "音效已开启" : "音效已关闭", "neutral");
  }

  handleWindowChange() {
    this.updateWindowIndicator();
    if (this.isEditorMode) this.updateEditorParryWindowStatus();
  }

  toggleEditorMode() {
    if (this.isEditorMode) {
      this.exitEditorMode();
    } else {
      this.enterEditorMode();
    }
  }

  toggleAdvancedEditorPanel() {
    if (!this.isEditorMode) return;

    const willOpen = this.editorPanel.classList.contains("hidden");
    this.editorPanel.classList.toggle("hidden", !willOpen);
    this.runtimeEditorAdvancedButton.setAttribute("aria-expanded", String(willOpen));
    this.runtimeEditorAdvancedButton.textContent = willOpen ? "收起参数" : "更多参数";

    if (willOpen) {
      this.renderEditor();
      this.editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      this.editorPatternNameInput.focus({ preventScroll: true });
      this.setStatus("已展开高级参数 · 画布编辑仍可直接使用", "neutral");
    } else {
      this.setStatus("已收起高级参数 · 可继续直接在画布编辑", "neutral");
    }
  }

  enterEditorMode() {
    if (this.state !== COMBAT_STATE.IDLE) this.resetCombat(false);

    this.isEditorMode = true;
    this.selectedSegmentIndex = clamp(this.selectedSegmentIndex, 0, this.currentPattern.segments.length - 1);
    this.editorPanel.classList.add("hidden");
    this.runtimeEditorBar.classList.remove("hidden");
    this.editorEntryButton.textContent = "退出画布编辑";
    this.editorEntryButton.setAttribute("aria-pressed", "true");
    this.runtimeEditorAdvancedButton.setAttribute("aria-expanded", "false");
    this.runtimeEditorAdvancedButton.textContent = "更多参数";
    this.canvas.classList.add("is-editing");
    this.canvas.setAttribute("aria-label", "画布编辑。可点击曲线选择段落，拖动 P0 到 P3 控制点修改路径，拖动玩家受击圆环调整半径，拖动橙色 W 手柄调整内置弹反判定窗。");
    this.canvas.setAttribute("aria-describedby", "runtime-editor-help");
    this.renderEditor();
    this.updateControls();
    this.setStatus("画布编辑已开启 · 拖橙色 W 手柄直接调整弹反窗", "warning");
    this.showFeedback("CANVAS EDITOR", "neutral");
  }

  exitEditorMode() {
    if (!this.isEditorMode) return;

    this.draggedControl = null;
    this.isEditorMode = false;
    this.editorPanel.classList.add("hidden");
    this.runtimeEditorBar.classList.add("hidden");
    this.editorEntryButton.textContent = "进入画布编辑";
    this.editorEntryButton.setAttribute("aria-pressed", "false");
    this.runtimeEditorAdvancedButton.setAttribute("aria-expanded", "false");
    this.runtimeEditorAdvancedButton.textContent = "更多参数";
    this.canvas.classList.remove("is-editing", "is-dragging");
    this.canvas.setAttribute("aria-label", "敌方剑锋沿贝塞尔轨迹接近玩家受击区的战斗可视化");
    this.canvas.removeAttribute("aria-describedby");
    this.updateControls();
    this.setStatus("已退出编辑模式 · 修改仍保留到刷新页面", "neutral");
  }

  renderEditor() {
    if (!this.isEditorMode) return;

    this.editorPatternNameInput.value = this.currentPattern.name;
    this.renderEditorSegmentList();
    this.refreshEditorForm();
    this.updateRuntimeEditorBar();
  }

  renderEditorSegmentList() {
    this.editorSegmentList.replaceChildren();

    this.currentPattern.segments.forEach(function (segment, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-segment-button";
      button.dataset.segmentIndex = String(index);
      button.setAttribute("aria-pressed", String(index === this.selectedSegmentIndex));
      if (index === this.selectedSegmentIndex) button.classList.add("is-selected");

      const title = document.createElement("span");
      title.className = "editor-segment-button__title";
      title.textContent = "第 " + (index + 1) + " 段 · " + segment.label;
      const details = document.createElement("span");
      details.className = "editor-segment-button__details";
      details.textContent = segment.durationMs + "ms · " + segment.easing;
      button.append(title, details);
      this.editorSegmentList.append(button);
    }.bind(this));

    this.editorDeleteSegmentButton.disabled = this.currentPattern.segments.length <= 1;
  }

  refreshEditorForm() {
    const segment = this.getSelectedSegment();
    if (!segment) return;

    this.editorSelectionDescription.textContent = "已选第 " + (this.selectedSegmentIndex + 1) + " 段，共 " + this.currentPattern.segments.length + " 段。P0 与 P3 是相邻段共享的连接点。";
    this.editorSegmentNameInput.value = segment.label;
    this.editorDurationInput.value = String(segment.durationMs);
    this.editorEasingSelect.value = segment.easing;
    this.editorPointInputs.forEach(function (input) {
      const point = segment[input.dataset.editorPoint];
      input.value = String(Math.round(point[input.dataset.editorAxis]));
    });
    this.syncPlayerHurtboxRadiusInputs();
    this.syncParryWindowInputs();
  }

  updateRuntimeEditorBar() {
    if (!this.isEditorMode) return;

    const segment = this.getSelectedSegment();
    this.runtimeEditorSelection.textContent = "画布编辑 · 第 " + (this.selectedSegmentIndex + 1) + "/" + this.currentPattern.segments.length + " 段 · " + segment.label + " · 弹反窗 " + this.currentPattern.parryWindowMs + "ms";
    this.runtimeEditorSplitButton.disabled = !segment;
    this.runtimeEditorDeleteButton.disabled = this.currentPattern.segments.length <= 1;
  }

  getSelectedSegment() {
    this.selectedSegmentIndex = clamp(this.selectedSegmentIndex, 0, this.currentPattern.segments.length - 1);
    return this.currentPattern.segments[this.selectedSegmentIndex];
  }

  selectSegment(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.currentPattern.segments.length) return;
    this.selectedSegmentIndex = index;
    this.renderEditorSegmentList();
    this.refreshEditorForm();
    this.updateRuntimeEditorBar();
    this.setStatus("已选第 " + (index + 1) + " 段 · 可直接拖动控制点", "neutral");
  }

  handleSegmentSelection(event) {
    const button = event.target.closest("button[data-segment-index]");
    if (!button) return;
    this.selectSegment(Number(button.dataset.segmentIndex));
  }

  handlePatternNameInput(event) {
    const nextName = event.target.value.trim() || "未命名招式";
    this.currentPattern.name = nextName;
    this.syncPatternOptionLabel();
  }

  handleSegmentNameInput(event) {
    this.getSelectedSegment().label = event.target.value.trim() || "未命名段落";
    this.renderEditorSegmentList();
    this.updateRuntimeEditorBar();
  }

  handleSegmentDurationInput(event) {
    if (event.target.value === "") return;
    const durationMs = Math.round(Number(event.target.value));
    if (!Number.isFinite(durationMs)) return;

    this.getSelectedSegment().durationMs = Math.max(EDITOR_MIN_DURATION_MS, durationMs);
    event.target.value = String(this.getSelectedSegment().durationMs);
    this.renderEditorSegmentList();
    this.updateRuntimeEditorBar();
    this.updateWindowIndicator();
  }

  handleSegmentEasingChange(event) {
    const easingName = event.target.value;
    if (!EASING_NAMES.includes(easingName)) return;
    this.getSelectedSegment().easing = easingName;
    this.renderEditorSegmentList();
    this.updateRuntimeEditorBar();
  }

  handlePointInput(event) {
    if (event.target.value === "") return;
    const coordinate = Number(event.target.value);
    if (!Number.isFinite(coordinate)) return;

    const segment = this.getSelectedSegment();
    const pointKey = event.target.dataset.editorPoint;
    const axis = event.target.dataset.editorAxis;
    const nextPoint = clonePoint(segment[pointKey]);
    nextPoint[axis] = coordinate;
    this.setSegmentPoint(this.selectedSegmentIndex, pointKey, nextPoint);
    this.syncEditorPointInputs();
  }

  handlePlayerHurtboxRadiusInput(event) {
    if (event.target.value === "") return;

    const radius = Number(event.target.value);
    if (!Number.isFinite(radius)) return;

    this.setPlayerHurtboxRadius(radius);
    this.syncPlayerHurtboxRadiusInputs();
  }

  handleParryWindowInput(event) {
    if (event.target.value === "") return;

    const windowMs = Number(event.target.value);
    if (!Number.isFinite(windowMs)) return;

    this.setPatternParryWindow(windowMs);
    this.syncParryWindowInputs();
    this.updateWindowIndicator();
  }

  applyPatternParryWindow() {
    this.windowSelect.value = "pattern";
    this.updateWindowIndicator();
    this.updateEditorParryWindowStatus();
    this.setStatus("当前练习已启用招式内置判定窗 · " + this.currentPattern.parryWindowMs + "ms", "success");
    this.showFeedback("PATTERN WINDOW ENABLED", "success");
  }

  syncPatternOptionLabel() {
    const option = this.patternSelect.querySelector("option[value='" + this.currentPatternKey + "']");
    if (option) option.textContent = this.currentPattern.name;
  }

  syncEditorPointInputs() {
    const segment = this.getSelectedSegment();
    this.editorPointInputs.forEach(function (input) {
      const point = segment[input.dataset.editorPoint];
      input.value = String(Math.round(point[input.dataset.editorAxis]));
    });
  }

  syncPlayerHurtboxRadiusInputs() {
    const radius = this.getPlayerHurtbox().radius;
    this.editorHurtboxRadiusRange.value = String(radius);
    this.editorHurtboxRadiusInput.value = String(radius);
    this.editorHurtboxValue.textContent = "半径 " + radius + "px";
  }

  setPlayerHurtboxRadius(radius) {
    this.currentPattern.playerHurtboxRadius = normalizePlayerHurtboxRadius(radius);
  }

  syncParryWindowInputs() {
    const windowMs = normalizeParryWindowMs(this.currentPattern.parryWindowMs);
    this.editorParryWindowRange.value = String(windowMs);
    this.editorParryWindowInput.value = String(windowMs);
    this.editorParryWindowValue.textContent = "窗口 " + windowMs + "ms";
    this.updateEditorParryWindowStatus();
  }

  updateEditorParryWindowStatus() {
    const effectiveWindowMs = this.getParryWindowMs();
    if (this.windowSelect.value === "pattern") {
      this.editorParryWindowStatus.textContent = "当前练习使用此招式内置值 · " + effectiveWindowMs + "ms";
      this.editorApplyPatternWindowButton.disabled = true;
      this.editorApplyPatternWindowButton.textContent = "当前已使用内置判定窗";
      return;
    }

    const selectedOption = this.windowSelect.options[this.windowSelect.selectedIndex];
    this.editorParryWindowStatus.textContent = "当前练习由「" + selectedOption.textContent + "」覆盖 · " + effectiveWindowMs + "ms";
    this.editorApplyPatternWindowButton.disabled = false;
    this.editorApplyPatternWindowButton.textContent = "使用此招式判定窗";
  }

  setPatternParryWindow(windowMs) {
    this.currentPattern.parryWindowMs = normalizeParryWindowMs(windowMs);
  }

  setSegmentPoint(segmentIndex, pointKey, point) {
    const segment = this.currentPattern.segments[segmentIndex];
    if (!segment || !segment[pointKey]) return;

    const boundedPoint = {
      x: clamp(Math.round(point.x), 0, this.canvas.width),
      y: clamp(Math.round(point.y), 0, this.canvas.height)
    };
    segment[pointKey] = boundedPoint;

    if (pointKey === "p0" && segmentIndex > 0) {
      this.currentPattern.segments[segmentIndex - 1].p3 = clonePoint(boundedPoint);
    }
    if (pointKey === "p3" && segmentIndex < this.currentPattern.segments.length - 1) {
      this.currentPattern.segments[segmentIndex + 1].p0 = clonePoint(boundedPoint);
    }

    this.cursorPos = clonePoint(this.getPatternStartPoint());
  }

  addSegmentAfterSelection() {
    const splitSegments = splitBezierSegment(this.getSelectedSegment());
    this.currentPattern.segments.splice(this.selectedSegmentIndex, 1, splitSegments[0], splitSegments[1]);
    this.selectedSegmentIndex += 1;
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.renderEditor();
    this.showFeedback("SEGMENT SPLIT · 已新增一段", "success");
    this.setStatus("已在当前曲线中拆分并新增段落", "success");
  }

  deleteSelectedSegment() {
    const segments = this.currentPattern.segments;
    if (segments.length <= 1) {
      this.showFeedback("至少保留一个段落", "danger");
      return;
    }

    const deletedIndex = this.selectedSegmentIndex;
    const deletedSegment = segments[deletedIndex];
    if (deletedIndex === 0) {
      segments[1].p0 = clonePoint(deletedSegment.p0);
    } else if (deletedIndex === segments.length - 1) {
      segments[deletedIndex - 1].p3 = clonePoint(deletedSegment.p3);
    } else {
      segments[deletedIndex + 1].p0 = clonePoint(segments[deletedIndex - 1].p3);
    }

    segments.splice(deletedIndex, 1);
    this.selectedSegmentIndex = Math.max(0, Math.min(deletedIndex, segments.length - 1));
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.renderEditor();
    this.showFeedback("SEGMENT REMOVED · 段落已删除", "danger");
    this.setStatus("段落已删除，曲线连接点已自动对齐", "neutral");
  }

  resetCurrentPatternEdits() {
    this.patternLibrary[this.currentPatternKey] = clonePattern(this.originalPatternLibrary[this.currentPatternKey]);
    this.currentPattern = this.patternLibrary[this.currentPatternKey];
    this.selectedSegmentIndex = 0;
    this.resetCombat(false);
    this.syncPatternOptionLabel();
    this.renderEditor();
    this.showFeedback("PATTERN RESTORED · 已恢复原始配置", "neutral");
    this.setStatus("当前招式已恢复为本页初始配置", "neutral");
  }

  handleCanvasPointerDown(event) {
    if (!this.isEditorMode) {
      this.handleParryInput();
      return;
    }

    event.preventDefault();
    const point = this.getCanvasPoint(event);
    if (this.findParryWindowResizeHandle(point)) {
      this.draggedControl = { kind: "parry-window", pointerId: event.pointerId };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add("is-dragging");
      this.windowSelect.value = "pattern";
      this.updateWindowIndicator();
      this.updateEditorParryWindowStatus();
      this.setStatus("正在调整内置弹反窗 · 拖动橙色 W 手柄", "warning");
      return;
    }

    if (this.findPlayerHurtboxResizeHandle(point)) {
      this.draggedControl = { kind: "player-hurtbox-radius", pointerId: event.pointerId };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add("is-dragging");
      this.setStatus("正在调整玩家受击区半径 · 拖动圆环边缘", "warning");
      return;
    }

    const handle = this.findEditorHandle(point);
    if (handle) {
      this.selectSegment(handle.segmentIndex);
      this.draggedControl = { kind: "segment-point", segmentIndex: handle.segmentIndex, pointKey: handle.pointKey, pointerId: event.pointerId };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.classList.add("is-dragging");
      return;
    }

    const closestSegmentIndex = this.findClosestSegment(point);
    if (closestSegmentIndex !== null) this.selectSegment(closestSegmentIndex);
  }

  handleCanvasPointerMove(event) {
    if (!this.isEditorMode || !this.draggedControl || this.draggedControl.pointerId !== event.pointerId) return;

    event.preventDefault();
    const point = this.getCanvasPoint(event);
    if (this.draggedControl.kind === "parry-window") {
      this.setParryWindowFromCanvasPoint(point);
      this.setStatus("正在调整内置弹反窗 · " + this.currentPattern.parryWindowMs + "ms", "warning");
    } else if (this.draggedControl.kind === "player-hurtbox-radius") {
      const hurtbox = this.getPlayerHurtbox();
      this.setPlayerHurtboxRadius(Math.hypot(point.x - hurtbox.center.x, point.y - hurtbox.center.y));
      this.syncPlayerHurtboxRadiusInputs();
    } else {
      this.setSegmentPoint(this.draggedControl.segmentIndex, this.draggedControl.pointKey, point);
      this.syncEditorPointInputs();
    }
  }

  handleCanvasPointerUp(event) {
    if (!this.draggedControl || this.draggedControl.pointerId !== event.pointerId) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.draggedControl = null;
    this.canvas.classList.remove("is-dragging");
  }

  getCanvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * this.canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * this.canvas.height / bounds.height
    };
  }

  getPlayerHurtboxResizeHandle() {
    const hurtbox = this.getPlayerHurtbox();
    const direction = hurtbox.center.x + hurtbox.radius + 14 <= this.canvas.width ? 1 : -1;
    return {
      x: hurtbox.center.x + hurtbox.radius * direction,
      y: hurtbox.center.y,
      direction: direction
    };
  }

  findPlayerHurtboxResizeHandle(point) {
    const hurtbox = this.getPlayerHurtbox();
    const resizeHandle = this.getPlayerHurtboxResizeHandle();
    const handleDistance = Math.hypot(point.x - resizeHandle.x, point.y - resizeHandle.y);
    const ringDistance = Math.abs(Math.hypot(point.x - hurtbox.center.x, point.y - hurtbox.center.y) - hurtbox.radius);
    return handleDistance <= 17 || ringDistance <= 8;
  }

  findEditorHandle(point) {
    const orderedIndexes = [this.selectedSegmentIndex].concat(this.currentPattern.segments.map(function (_, index) { return index; }).filter(function (index) { return index !== this.selectedSegmentIndex; }.bind(this)));
    let nearestHandle = null;
    let nearestDistanceSquared = 16 * 16;

    orderedIndexes.forEach(function (segmentIndex) {
      const segment = this.currentPattern.segments[segmentIndex];
      ["p1", "p2", "p0", "p3"].forEach(function (pointKey) {
        const candidate = segment[pointKey];
        const deltaX = candidate.x - point.x;
        const deltaY = candidate.y - point.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared <= nearestDistanceSquared) {
          nearestHandle = { segmentIndex: segmentIndex, pointKey: pointKey };
          nearestDistanceSquared = distanceSquared;
        }
      });
    }.bind(this));

    return nearestHandle;
  }

  findClosestSegment(point) {
    let closestIndex = null;
    let closestDistanceSquared = 18 * 18;

    this.currentPattern.segments.forEach(function (segment, segmentIndex) {
      for (let sampleIndex = 0; sampleIndex <= 32; sampleIndex += 1) {
        const sample = cubicBezier(segment.p0, segment.p1, segment.p2, segment.p3, sampleIndex / 32);
        const deltaX = sample.x - point.x;
        const deltaY = sample.y - point.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared <= closestDistanceSquared) {
          closestIndex = segmentIndex;
          closestDistanceSquared = distanceSquared;
        }
      }
    });

    return closestIndex;
  }

  handleKeyDown(event) {
    if (event.repeat) return;

    if (this.isEditorMode) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.exitEditorMode();
      }
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (this.state === COMBAT_STATE.IDLE) {
        this.startAttack();
      } else {
        this.handleParryInput();
      }
      return;
    }

    if (event.code === "Enter") {
      event.preventDefault();
      if (this.state === COMBAT_STATE.IDLE) this.startAttack();
    }
  }

  getParryWindowMs() {
    return this.windowSelect.value === "pattern"
      ? normalizeParryWindowMs(this.currentPattern.parryWindowMs)
      : Number(this.windowSelect.value);
  }

  getPatternStartPoint() {
    return this.currentPattern.segments[0].p0;
  }

  getPatternEndPoint() {
    const lastIndex = this.currentPattern.segments.length - 1;
    return this.currentPattern.segments[lastIndex].p3;
  }

  getPlayerHurtbox() {
    return {
      center: PLAYER_POSITION,
      radius: normalizePlayerHurtboxRadius(this.currentPattern.playerHurtboxRadius)
    };
  }

  getParryWindowPreview() {
    const totalDurationMs = this.calculateTotalDuration();
    const parryWindowMs = normalizeParryWindowMs(this.currentPattern.parryWindowMs);
    const previewDurationMs = Math.min(parryWindowMs, totalDurationMs);
    const previewStartMs = Math.max(0, totalDurationMs - previewDurationMs);

    return {
      totalDurationMs: totalDurationMs,
      parryWindowMs: parryWindowMs,
      previewDurationMs: previewDurationMs,
      previewStartMs: previewStartMs,
      previewStart: this.evaluateTrajectory(previewStartMs).position
    };
  }

  getParryWindowResizeHandle() {
    const preview = this.getParryWindowPreview();
    const lookAheadMs = Math.min(preview.totalDurationMs, preview.previewStartMs + Math.max(16, Math.min(72, preview.previewDurationMs)));
    const lookAhead = this.evaluateTrajectory(lookAheadMs).position;
    let deltaX = lookAhead.x - preview.previewStart.x;
    let deltaY = lookAhead.y - preview.previewStart.y;
    let magnitude = Math.hypot(deltaX, deltaY);

    if (magnitude < 0.1) {
      const endPoint = this.getPatternEndPoint();
      deltaX = endPoint.x - preview.previewStart.x;
      deltaY = endPoint.y - preview.previewStart.y;
      magnitude = Math.hypot(deltaX, deltaY) || 1;
    }

    const offset = 34;
    const candidates = [
      { x: preview.previewStart.x - deltaY / magnitude * offset, y: preview.previewStart.y + deltaX / magnitude * offset },
      { x: preview.previewStart.x + deltaY / magnitude * offset, y: preview.previewStart.y - deltaX / magnitude * offset }
    ];
    const handle = candidates.find(function (candidate) {
      return candidate.x >= 14 && candidate.x <= this.canvas.width - 14 && candidate.y >= 14 && candidate.y <= this.canvas.height - 14;
    }.bind(this)) || candidates[0];

    return {
      x: handle.x,
      y: handle.y,
      anchor: preview.previewStart,
      parryWindowMs: preview.parryWindowMs
    };
  }

  findParryWindowResizeHandle(point) {
    const resizeHandle = this.getParryWindowResizeHandle();
    return Math.hypot(point.x - resizeHandle.x, point.y - resizeHandle.y) <= 18;
  }

  findClosestTrajectoryElapsedMs(point) {
    let closestElapsedMs = 0;
    let closestDistanceSquared = Number.POSITIVE_INFINITY;
    let accumulatedMs = 0;

    this.currentPattern.segments.forEach(function (segment) {
      const sampleCount = 80;
      for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
        const elapsedMs = accumulatedMs + segment.durationMs * sampleIndex / sampleCount;
        const sample = this.evaluateTrajectory(elapsedMs).position;
        const deltaX = sample.x - point.x;
        const deltaY = sample.y - point.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared < closestDistanceSquared) {
          closestDistanceSquared = distanceSquared;
          closestElapsedMs = elapsedMs;
        }
      }
      accumulatedMs += segment.durationMs;
    }.bind(this));

    return closestElapsedMs;
  }

  setParryWindowFromCanvasPoint(point) {
    const totalDurationMs = this.calculateTotalDuration();
    const closestElapsedMs = this.findClosestTrajectoryElapsedMs(point);
    this.windowSelect.value = "pattern";
    this.setPatternParryWindow(totalDurationMs - closestElapsedMs);
    this.syncParryWindowInputs();
    this.updateWindowIndicator();
    this.updateRuntimeEditorBar();
  }

  isInsidePlayerHurtbox(position) {
    const hurtbox = this.getPlayerHurtbox();
    return Math.hypot(position.x - hurtbox.center.x, position.y - hurtbox.center.y) <= hurtbox.radius;
  }

  calculateTotalDuration() {
    return this.currentPattern.segments.reduce(function (total, segment) {
      return total + segment.durationMs;
    }, 0);
  }

  startAttack() {
    if (this.isEditorMode || this.state !== COMBAT_STATE.IDLE) return;

    this.clearAutoStart();
    this.state = COMBAT_STATE.ATTACKING;
    this.startTime = performance.now();
    this.elapsedMs = 0;
    this.totalDurationMs = this.calculateTotalDuration();
    this.currentSegmentIndex = 0;
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.cursorTrail = [];
    this.setStatus("敌方剑锋逼近中 · 观察最后一段斩击", "warning");
    this.showFeedback("ATTACK INCOMING", "neutral");
    this.updateControls();
    this.updateWindowIndicator();
  }

  handleParryInput() {
    if (this.isEditorMode) return;

    if (this.state === COMBAT_STATE.DEATHBLOW) {
      this.executeDeathblow();
      return;
    }

    if (this.state !== COMBAT_STATE.ATTACKING) return;

    this.advanceAttack(performance.now(), false);
    if (this.state !== COMBAT_STATE.ATTACKING) return;

    const remainingMs = this.totalDurationMs - this.elapsedMs;
    const parryWindowMs = this.getParryWindowMs();
    if (remainingMs >= 0 && remainingMs <= parryWindowMs) {
      this.triggerParrySuccess();
    } else if (remainingMs < 0) {
      this.resolveAttackImpact();
    } else {
      this.screenShake = Math.max(this.screenShake, 5);
      this.showFeedback("TOO EARLY · 时机过早", "danger");
      this.setStatus("弹反过早 · 等待招式进入弹反窗口", "danger");
    }
  }

  triggerParrySuccess() {
    this.state = COMBAT_STATE.PARRY_BOUNCE;
    this.enemyPosture = clamp(this.enemyPosture + this.currentPattern.postureGain, 0, MAX_VALUE);
    this.enemyHp = clamp(this.enemyHp - this.currentPattern.enemyDamage, 0, MAX_VALUE);
    this.particles.spawnSparks(this.cursorPos.x, this.cursorPos.y, 42);
    this.screenShake = Math.max(this.screenShake, 13);
    this.audio.playDeflect();
    this.showFeedback("PERFECT PARRY · 完美弹反", "success");
    this.setStatus("弹反成功 · 敌方架势与生命受损", "success");
    this.bounce = {
      startX: this.cursorPos.x,
      startY: this.cursorPos.y,
      endX: this.getPatternStartPoint().x,
      endY: this.getPatternStartPoint().y,
      startTime: performance.now(),
      durationMs: 250
    };
    this.updateHud();
    this.updateControls();
  }

  resolveAttackImpact() {
    if (this.state !== COMBAT_STATE.ATTACKING) return;

    if (this.isInsidePlayerHurtbox(this.cursorPos)) {
      this.triggerPlayerHit();
    } else {
      this.triggerAttackMiss();
    }
  }

  triggerPlayerHit() {
    if (this.state !== COMBAT_STATE.ATTACKING) return;

    this.clearAutoStart();
    this.playerHp = clamp(this.playerHp - this.currentPattern.damage, 0, MAX_VALUE);
    this.enemyPosture = 0;
    this.cursorPos = clonePoint(this.getPatternEndPoint());
    this.cursorTrail = [];
    this.particles.spawnSparks(this.getPatternEndPoint().x, this.getPatternEndPoint().y, 28);
    this.screenShake = Math.max(this.screenShake, 20);
    this.audio.playHit();
    this.showFeedback("HIT · 玩家受击", "danger");

    if (this.playerHp <= 0) {
      this.state = COMBAT_STATE.DEFEATED;
      this.setStatus("死 · 战斗结束，请重置后再试", "danger");
    } else {
      this.state = COMBAT_STATE.IDLE;
      this.setStatus("受击 · 敌方架势已清空", "danger");
      this.scheduleAutoStart(1200);
    }

    this.updateHud();
    this.updateControls();
    this.updateWindowIndicator();
  }

  triggerAttackMiss() {
    if (this.state !== COMBAT_STATE.ATTACKING) return;

    this.clearAutoStart();
    this.state = COMBAT_STATE.IDLE;
    this.cursorPos = clonePoint(this.getPatternEndPoint());
    this.cursorTrail = [];
    this.showFeedback("MISS · 攻击落空", "neutral");
    this.setStatus("攻击落空 · 终点未命中玩家受击区", "neutral");
    this.updateControls();
    this.updateWindowIndicator();
    this.scheduleAutoStart(900);
  }

  updateBounce(timestamp) {
    const bounce = this.bounce;
    if (!bounce) return;

    const progress = clamp((timestamp - bounce.startTime) / bounce.durationMs, 0, 1);
    const easedProgress = EASINGS.easeOutExpo(progress);
    this.cursorPos = {
      x: bounce.startX + (bounce.endX - bounce.startX) * easedProgress,
      y: bounce.startY + (bounce.endY - bounce.startY) * easedProgress
    };

    if (progress < 1) return;

    this.bounce = null;
    this.cursorTrail = [];
    if (this.enemyPosture >= MAX_VALUE) {
      this.enterDeathblowState();
      return;
    }

    this.state = COMBAT_STATE.IDLE;
    this.setStatus("弹反成功 · 可继续观察下一招", "success");
    this.updateControls();
    this.updateWindowIndicator();
    this.scheduleAutoStart(900);
  }

  enterDeathblowState() {
    this.state = COMBAT_STATE.DEATHBLOW;
    this.deathblowOverlay.classList.remove("hidden");
    this.audio.playDeathblow();
    this.showFeedback("POSTURE BROKEN · 忍殺机会", "danger");
    this.setStatus("敌方架势已崩溃 · 执行忍殺", "danger");
    this.updateControls();
    this.updateWindowIndicator();
    this.deathblowButton.focus();
  }

  executeDeathblow() {
    if (this.state !== COMBAT_STATE.DEATHBLOW) return;

    this.state = COMBAT_STATE.VICTORY;
    this.enemyHp = 0;
    this.enemyPosture = MAX_VALUE;
    this.deathblowOverlay.classList.add("hidden");
    this.particles.spawnSparks(this.getPatternStartPoint().x, this.getPatternStartPoint().y, 90);
    this.screenShake = Math.max(this.screenShake, 15);
    this.audio.playDeathblow();
    this.showFeedback("忍殺 SUCCESSFUL", "success");
    this.setStatus("大胜 · 按“重置战斗”开始新的试炼", "success");
    this.updateHud();
    this.updateControls();
    this.updateWindowIndicator();
  }

  resetCombat(announce) {
    this.clearAutoStart();
    this.state = COMBAT_STATE.IDLE;
    this.playerHp = MAX_VALUE;
    this.enemyHp = MAX_VALUE;
    this.enemyPosture = 0;
    this.elapsedMs = 0;
    this.totalDurationMs = 0;
    this.currentSegmentIndex = 0;
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.cursorTrail = [];
    this.bounce = null;
    this.screenShake = 0;
    this.particles.clear();
    this.deathblowOverlay.classList.add("hidden");
    this.updateHud();
    this.updateControls();
    this.updateWindowIndicator();
    this.setStatus("准备就绪 · Space 发起攻击", "neutral");
    if (announce) this.showFeedback("BATTLE RESET · 战斗已重置", "neutral");
  }

  scheduleAutoStart(delayMs) {
    if (this.isEditorMode || !this.autoLoop.checked || this.state !== COMBAT_STATE.IDLE) return;
    this.clearAutoStart();
    this.autoStartTimer = window.setTimeout(function () {
      this.autoStartTimer = null;
      this.startAttack();
    }.bind(this), delayMs);
  }

  clearAutoStart() {
    if (this.autoStartTimer !== null) {
      window.clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  evaluateTrajectory(elapsedMs) {
    let accumulatedMs = 0;
    for (let index = 0; index < this.currentPattern.segments.length; index += 1) {
      const segment = this.currentPattern.segments[index];
      const segmentEndMs = accumulatedMs + segment.durationMs;
      if (elapsedMs <= segmentEndMs || index === this.currentPattern.segments.length - 1) {
        const rawProgress = clamp((elapsedMs - accumulatedMs) / segment.durationMs, 0, 1);
        const easedProgress = EASINGS[segment.easing](rawProgress);
        return {
          position: cubicBezier(segment.p0, segment.p1, segment.p2, segment.p3, easedProgress),
          segmentIndex: index
        };
      }
      accumulatedMs = segmentEndMs;
    }

    return { position: clonePoint(this.getPatternEndPoint()), segmentIndex: this.currentPattern.segments.length - 1 };
  }

  advanceAttack(timestamp, resolveHit) {
    this.elapsedMs = Math.max(0, timestamp - this.startTime);
    const trajectory = this.evaluateTrajectory(Math.min(this.elapsedMs, this.totalDurationMs));
    this.cursorPos = trajectory.position;
    this.currentSegmentIndex = trajectory.segmentIndex;
    this.cursorTrail.push({ x: this.cursorPos.x, y: this.cursorPos.y });
    if (this.cursorTrail.length > 20) this.cursorTrail.shift();

    if (resolveHit && this.elapsedMs >= this.totalDurationMs) this.resolveAttackImpact();
  }

  updateHud() {
    this.enemyPostureBar.style.width = this.enemyPosture + "%";
    this.enemyPostureText.textContent = this.enemyPosture + "%";
    this.enemyHpBar.style.width = this.enemyHp + "%";
    this.enemyHpText.textContent = "HP " + this.enemyHp + " / " + MAX_VALUE;
    this.playerHpBar.style.width = this.playerHp + "%";
    this.playerHpText.textContent = "HP " + this.playerHp + " / " + MAX_VALUE;
    this.enemyPostureProgress.setAttribute("aria-valuenow", String(this.enemyPosture));
    this.enemyHpProgress.setAttribute("aria-valuenow", String(this.enemyHp));
    this.playerHpProgress.setAttribute("aria-valuenow", String(this.playerHp));
  }

  updateControls() {
    const isIdle = this.state === COMBAT_STATE.IDLE;
    const canUseEditor = isIdle || this.isEditorMode;
    const canParry = !this.isEditorMode && (this.state === COMBAT_STATE.ATTACKING || this.state === COMBAT_STATE.DEATHBLOW);
    this.attackButton.disabled = !isIdle || this.isEditorMode;
    this.parryButton.disabled = !canParry;
    this.patternSelect.disabled = !isIdle;
    this.windowSelect.disabled = !isIdle || this.isEditorMode;
    this.autoLoop.disabled = this.isEditorMode;
    this.editorEntryButton.disabled = !canUseEditor;
    this.runtimeEditorSplitButton.disabled = !this.isEditorMode;
    this.runtimeEditorDeleteButton.disabled = !this.isEditorMode || this.currentPattern.segments.length <= 1;
    this.runtimeEditorAdvancedButton.disabled = !this.isEditorMode;
    this.runtimeEditorExitButton.disabled = !this.isEditorMode;
  }

  updateWindowIndicator() {
    const parryWindowMs = this.getParryWindowMs();
    const remainingMs = this.totalDurationMs - this.elapsedMs;
    const isActive = this.state === COMBAT_STATE.ATTACKING && remainingMs >= 0 && remainingMs <= parryWindowMs;
    const nextText = isActive ? "弹反窗口开启 · " + parryWindowMs + "ms" : "判定窗 " + parryWindowMs + "ms";
    if (this.windowIndicator.textContent !== nextText) this.windowIndicator.textContent = nextText;
    this.windowIndicator.dataset.active = isActive ? "true" : "false";
  }

  setStatus(text, tone) {
    this.playerStatus.textContent = text;
    this.playerStatus.dataset.tone = tone || "neutral";
  }

  showFeedback(text, tone) {
    this.timingFeedback.textContent = text;
    this.timingFeedback.dataset.tone = tone || "neutral";
    this.timingFeedback.classList.add("show");
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(function () {
      this.timingFeedback.classList.remove("show");
    }.bind(this), 900);
  }

  loop(timestamp) {
    const deltaMs = this.lastFrameTime === 0 ? 16 : Math.min(50, timestamp - this.lastFrameTime);
    this.lastFrameTime = timestamp;

    if (this.state === COMBAT_STATE.ATTACKING) this.advanceAttack(timestamp, true);
    if (this.state === COMBAT_STATE.PARRY_BOUNCE) this.updateBounce(timestamp);

    this.particles.update(deltaMs);
    this.screenShake = Math.max(0, this.screenShake - deltaMs * 0.055);
    this.updateWindowIndicator();
    this.render();
    window.requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    const context = this.context;
    context.save();

    if (this.screenShake > 0.5) {
      const offsetX = (Math.random() - 0.5) * this.screenShake;
      const offsetY = (Math.random() - 0.5) * this.screenShake;
      context.translate(offsetX, offsetY);
    }

    this.drawBackground(context);
    if (this.showWireframe.checked || this.isEditorMode) this.drawWireframe(context);
    this.drawCombatAnchors(context);
    this.drawCursorTrail(context);
    this.drawCursor(context);
    this.particles.draw(context);
    context.restore();
  }

  drawBackground(context) {
    const background = context.createRadialGradient(300, 290, 40, 300, 330, 430);
    background.addColorStop(0, "#1b1713");
    background.addColorStop(0.7, "#100f0d");
    background.addColorStop(1, "#080706");
    context.fillStyle = background;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const startPoint = this.getPatternStartPoint();
    const endPoint = this.getPatternEndPoint();
    context.strokeStyle = "rgba(201, 160, 99, 0.06)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(startPoint.x, Math.max(0, startPoint.y - 66));
    context.lineTo(endPoint.x, Math.min(this.canvas.height, endPoint.y + 40));
    context.stroke();
  }

  drawWireframe(context) {
    this.currentPattern.segments.forEach(function (segment, index) {
      const isStrikeSegment = index === this.currentPattern.segments.length - 1;
      const isCurrentSegment = index === this.currentSegmentIndex && this.state === COMBAT_STATE.ATTACKING;
      const isSelectedSegment = this.isEditorMode && index === this.selectedSegmentIndex;

      context.save();
      context.beginPath();
      context.moveTo(segment.p0.x, segment.p0.y);
      context.bezierCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y, segment.p3.x, segment.p3.y);
      context.strokeStyle = isSelectedSegment ? "#f5cf83" : (isStrikeSegment ? "rgba(255, 69, 0, 0.7)" : "rgba(201, 160, 99, 0.34)");
      context.lineWidth = isSelectedSegment ? 4 : (isCurrentSegment ? 3 : 2);
      context.setLineDash(isSelectedSegment ? [] : [6, 4]);
      context.stroke();
      context.setLineDash([]);

      context.strokeStyle = isSelectedSegment ? "rgba(245, 207, 131, 0.58)" : "rgba(176, 164, 148, 0.22)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(segment.p0.x, segment.p0.y);
      context.lineTo(segment.p1.x, segment.p1.y);
      context.moveTo(segment.p2.x, segment.p2.y);
      context.lineTo(segment.p3.x, segment.p3.y);
      context.stroke();

      if (this.isEditorMode) {
        ["p0", "p1", "p2", "p3"].forEach(function (pointKey) {
          const point = segment[pointKey];
          const isEndpoint = pointKey === "p0" || pointKey === "p3";
          context.beginPath();
          context.arc(point.x, point.y, isSelectedSegment ? 6 : 4.5, 0, Math.PI * 2);
          context.fillStyle = isEndpoint ? "#ff8b5b" : "#f5cf83";
          context.fill();
          context.strokeStyle = "#1b1713";
          context.lineWidth = 1.5;
          context.stroke();
          if (isSelectedSegment) {
            context.fillStyle = "#fff0cf";
            context.font = "10px Consolas, monospace";
            context.fillText(pointKey.toUpperCase(), point.x + 8, point.y - 8);
          }
        });
      } else {
        context.fillStyle = "#c9a063";
        [segment.p1, segment.p2].forEach(function (point) {
          context.beginPath();
          context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
          context.fill();
        });
      }

      context.fillStyle = isSelectedSegment ? "#f5cf83" : "rgba(201, 160, 99, 0.7)";
      context.font = "10px Microsoft YaHei, sans-serif";
      context.fillText((this.isEditorMode ? "第 " + (index + 1) + " 段 · " : "") + segment.label + " · " + segment.durationMs + "ms", (segment.p0.x + segment.p3.x) / 2, (segment.p0.y + segment.p3.y) / 2 - 9);
      context.restore();
    }.bind(this));

    if (this.isEditorMode) this.drawParryWindowPreview(context);
  }

  drawParryWindowPreview(context) {
    const preview = this.getParryWindowPreview();
    const resizeHandle = this.getParryWindowResizeHandle();
    const sampleCount = clamp(Math.ceil(preview.previewDurationMs / 16), 12, 48);

    context.save();
    context.strokeStyle = "#ff9f1a";
    context.lineWidth = 4;
    context.shadowColor = "#ff6a22";
    context.shadowBlur = 12;
    context.beginPath();
    context.moveTo(preview.previewStart.x, preview.previewStart.y);
    for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
      const elapsedMs = preview.previewStartMs + preview.previewDurationMs * sampleIndex / sampleCount;
      const sample = this.evaluateTrajectory(elapsedMs).position;
      context.lineTo(sample.x, sample.y);
    }
    context.stroke();
    context.shadowBlur = 0;

    context.beginPath();
    context.arc(preview.previewStart.x, preview.previewStart.y, 3, 0, Math.PI * 2);
    context.fillStyle = "#ff9f1a";
    context.fill();

    context.strokeStyle = "rgba(255, 159, 26, 0.82)";
    context.lineWidth = 1;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(preview.previewStart.x, preview.previewStart.y);
    context.lineTo(resizeHandle.x, resizeHandle.y);
    context.stroke();
    context.setLineDash([]);

    context.save();
    context.translate(resizeHandle.x, resizeHandle.y);
    context.rotate(Math.PI / 4);
    context.fillStyle = "#ff9f1a";
    context.fillRect(-6, -6, 12, 12);
    context.strokeStyle = "#1b1713";
    context.lineWidth = 1.5;
    context.strokeRect(-6, -6, 12, 12);
    context.restore();
    context.fillStyle = "#fff0cf";
    context.font = "10px Consolas, monospace";
    const labelX = resizeHandle.x < resizeHandle.anchor.x
      ? Math.max(8, resizeHandle.x - 56)
      : Math.min(this.canvas.width - 74, resizeHandle.x + 10);
    const labelY = resizeHandle.y >= resizeHandle.anchor.y
      ? Math.min(this.canvas.height - 8, resizeHandle.y + 16)
      : Math.max(12, resizeHandle.y - 10);
    context.fillText("W · " + preview.parryWindowMs + "ms", labelX, labelY);
    context.restore();
  }

  drawCombatAnchors(context) {
    const startPoint = this.getPatternStartPoint();
    const strikeEndPoint = this.getPatternEndPoint();
    const playerHurtbox = this.getPlayerHurtbox();
    const playerPoint = playerHurtbox.center;
    const isSeparateStrikePoint = Math.hypot(strikeEndPoint.x - playerPoint.x, strikeEndPoint.y - playerPoint.y) > 12;

    context.save();
    context.fillStyle = "#c9a063";
    context.shadowColor = "#c9a063";
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(startPoint.x, startPoint.y, 10, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(224, 216, 195, 0.68)";
    context.font = "11px Microsoft YaHei, sans-serif";
    context.fillText("敌方剑锋", startPoint.x - 25, startPoint.y - 18);

    context.strokeStyle = "#c95d45";
    context.lineWidth = 2;
    context.shadowColor = "#ff4500";
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(playerPoint.x, playerPoint.y, playerHurtbox.radius, 0, Math.PI * 2);
    if (this.isEditorMode) {
      context.fillStyle = "rgba(201, 93, 69, 0.1)";
      context.fill();
    }
    context.stroke();
    context.shadowBlur = 0;

    context.fillStyle = "#ff4500";
    context.beginPath();
    context.arc(playerPoint.x, playerPoint.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(224, 216, 195, 0.68)";
    context.fillText("玩家受击区 · " + playerHurtbox.radius + "px", playerPoint.x - 42, Math.min(this.canvas.height - 10, playerPoint.y + playerHurtbox.radius + 18));

    if (isSeparateStrikePoint) {
      context.save();
      context.translate(strikeEndPoint.x, strikeEndPoint.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = "#ff9f1a";
      context.fillRect(-4, -4, 8, 8);
      context.strokeStyle = "#1b1713";
      context.lineWidth = 1.5;
      context.strokeRect(-4, -4, 8, 8);
      context.restore();
      context.fillStyle = "#ffcf75";
      context.fillText("攻击终点", strikeEndPoint.x + 8, strikeEndPoint.y - 8);
    }

    if (this.isEditorMode) {
      const resizeHandle = this.getPlayerHurtboxResizeHandle();
      context.save();
      context.strokeStyle = "rgba(255, 158, 123, 0.78)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(playerPoint.x, playerPoint.y);
      context.lineTo(resizeHandle.x, resizeHandle.y);
      context.stroke();
      context.setLineDash([]);
      context.translate(resizeHandle.x, resizeHandle.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = "#ff9f7b";
      context.fillRect(-5, -5, 10, 10);
      context.strokeStyle = "#1b1713";
      context.lineWidth = 1.5;
      context.strokeRect(-5, -5, 10, 10);
      context.restore();
      context.fillStyle = "#fff0cf";
      context.font = "10px Consolas, monospace";
      context.fillText("R", resizeHandle.x + 8, resizeHandle.y - 8);
    }
    context.restore();
  }

  drawCursorTrail(context) {
    if (this.cursorTrail.length < 2) return;

    context.save();
    context.lineWidth = 2;
    for (let index = 0; index < this.cursorTrail.length - 1; index += 1) {
      const first = this.cursorTrail[index];
      const second = this.cursorTrail[index + 1];
      const alpha = (index + 1) / this.cursorTrail.length * 0.55;
      context.strokeStyle = "rgba(255, 174, 50, " + alpha + ")";
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.stroke();
    }
    context.restore();
  }

  drawCursor(context) {
    const shouldDraw = this.state === COMBAT_STATE.ATTACKING || this.state === COMBAT_STATE.PARRY_BOUNCE;
    if (!shouldDraw) return;

    context.save();
    context.fillStyle = "#ffffff";
    context.shadowColor = "#ff4500";
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(this.cursorPos.x, this.cursorPos.y, 8, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new GameEngine();
});
