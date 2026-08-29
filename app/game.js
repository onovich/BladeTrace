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
    this.currentPatternKey = "delayed";
    this.currentPattern = ATTACK_PATTERNS[this.currentPatternKey];
    this.startTime = 0;
    this.elapsedMs = 0;
    this.totalDurationMs = 0;
    this.currentSegmentIndex = 0;
    this.cursorPos = { x: ENEMY_POSITION.x, y: ENEMY_POSITION.y };
    this.cursorTrail = [];
    this.bounce = null;
    this.screenShake = 0;
    this.lastFrameTime = 0;
    this.autoStartTimer = null;
    this.feedbackTimer = null;

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
    this.windowSelect.addEventListener("change", this.updateWindowIndicator.bind(this));
    this.soundToggle.addEventListener("change", this.handleSoundChange.bind(this));
    this.canvas.addEventListener("pointerdown", this.handleParryInput.bind(this));

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handlePatternChange(event) {
    const nextPattern = ATTACK_PATTERNS[event.target.value];
    if (!nextPattern || this.state !== COMBAT_STATE.IDLE) return;
    this.currentPatternKey = event.target.value;
    this.currentPattern = nextPattern;
    this.resetCombat(false);
    this.setStatus("已选择「" + this.currentPattern.name + "」", "neutral");
  }

  handleSoundChange(event) {
    this.audio.enabled = event.target.checked;
    this.setStatus(event.target.checked ? "音效已开启" : "音效已关闭", "neutral");
  }

  handleKeyDown(event) {
    if (event.repeat) return;

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
      ? this.currentPattern.parryWindowMs
      : Number(this.windowSelect.value);
  }

  calculateTotalDuration() {
    return this.currentPattern.segments.reduce(function (total, segment) {
      return total + segment.durationMs;
    }, 0);
  }

  startAttack() {
    if (this.state !== COMBAT_STATE.IDLE) return;

    this.clearAutoStart();
    this.state = COMBAT_STATE.ATTACKING;
    this.startTime = performance.now();
    this.elapsedMs = 0;
    this.totalDurationMs = this.calculateTotalDuration();
    this.currentSegmentIndex = 0;
    this.cursorPos = { x: ENEMY_POSITION.x, y: ENEMY_POSITION.y };
    this.cursorTrail = [];
    this.setStatus("敌方剑锋逼近中 · 观察最后一段斩击", "warning");
    this.showFeedback("ATTACK INCOMING", "neutral");
    this.updateControls();
    this.updateWindowIndicator();
  }

  handleParryInput() {
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
      this.triggerPlayerHit();
    } else {
      this.screenShake = Math.max(this.screenShake, 5);
      this.showFeedback("TOO EARLY · 时机过早", "danger");
      this.setStatus("弹反过早 · 等待剑锋进入判定环", "danger");
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
      endX: ENEMY_POSITION.x,
      endY: ENEMY_POSITION.y,
      startTime: performance.now(),
      durationMs: 250
    };
    this.updateHud();
    this.updateControls();
  }

  triggerPlayerHit() {
    if (this.state !== COMBAT_STATE.ATTACKING) return;

    this.clearAutoStart();
    this.playerHp = clamp(this.playerHp - this.currentPattern.damage, 0, MAX_VALUE);
    this.enemyPosture = 0;
    this.cursorPos = { x: PLAYER_POSITION.x, y: PLAYER_POSITION.y };
    this.cursorTrail = [];
    this.particles.spawnSparks(PLAYER_POSITION.x, PLAYER_POSITION.y, 28);
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
    this.particles.spawnSparks(ENEMY_POSITION.x, ENEMY_POSITION.y, 90);
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
    this.cursorPos = { x: ENEMY_POSITION.x, y: ENEMY_POSITION.y };
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
    if (!this.autoLoop.checked || this.state !== COMBAT_STATE.IDLE) return;
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

    return { position: PLAYER_POSITION, segmentIndex: this.currentPattern.segments.length - 1 };
  }

  advanceAttack(timestamp, resolveHit) {
    this.elapsedMs = Math.max(0, timestamp - this.startTime);
    const trajectory = this.evaluateTrajectory(Math.min(this.elapsedMs, this.totalDurationMs));
    this.cursorPos = trajectory.position;
    this.currentSegmentIndex = trajectory.segmentIndex;
    this.cursorTrail.push({ x: this.cursorPos.x, y: this.cursorPos.y });
    if (this.cursorTrail.length > 20) this.cursorTrail.shift();

    if (resolveHit && this.elapsedMs >= this.totalDurationMs) {
      this.triggerPlayerHit();
    }
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
    const canParry = this.state === COMBAT_STATE.ATTACKING || this.state === COMBAT_STATE.DEATHBLOW;
    this.attackButton.disabled = !isIdle;
    this.parryButton.disabled = !canParry;
    this.patternSelect.disabled = !isIdle;
    this.windowSelect.disabled = !isIdle;
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
    if (this.showWireframe.checked) this.drawWireframe(context);
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

    context.strokeStyle = "rgba(201, 160, 99, 0.06)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(300, 34);
    context.lineTo(300, 610);
    context.stroke();
  }

  drawWireframe(context) {
    this.currentPattern.segments.forEach(function (segment, index) {
      const isStrikeSegment = index === this.currentPattern.segments.length - 1;
      const isCurrentSegment = index === this.currentSegmentIndex && this.state === COMBAT_STATE.ATTACKING;

      context.save();
      context.beginPath();
      context.moveTo(segment.p0.x, segment.p0.y);
      context.bezierCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y, segment.p3.x, segment.p3.y);
      context.strokeStyle = isStrikeSegment ? "rgba(255, 69, 0, 0.7)" : "rgba(201, 160, 99, 0.34)";
      context.lineWidth = isCurrentSegment ? 3 : 2;
      context.setLineDash([6, 4]);
      context.stroke();
      context.setLineDash([]);

      context.strokeStyle = "rgba(176, 164, 148, 0.22)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(segment.p0.x, segment.p0.y);
      context.lineTo(segment.p1.x, segment.p1.y);
      context.moveTo(segment.p2.x, segment.p2.y);
      context.lineTo(segment.p3.x, segment.p3.y);
      context.stroke();

      context.fillStyle = "#c9a063";
      [segment.p1, segment.p2].forEach(function (point) {
        context.beginPath();
        context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        context.fill();
      });

      context.fillStyle = "rgba(201, 160, 99, 0.7)";
      context.font = "10px Microsoft YaHei, sans-serif";
      context.fillText(segment.label + " · " + segment.durationMs + "ms", (segment.p0.x + segment.p3.x) / 2, (segment.p0.y + segment.p3.y) / 2 - 9);
      context.restore();
    }.bind(this));
  }

  drawCombatAnchors(context) {
    const remainingMs = this.totalDurationMs - this.elapsedMs;
    const isWindowActive = this.state === COMBAT_STATE.ATTACKING && remainingMs >= 0 && remainingMs <= this.getParryWindowMs();

    context.save();
    context.fillStyle = "#c9a063";
    context.shadowColor = "#c9a063";
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(ENEMY_POSITION.x, ENEMY_POSITION.y, 10, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(224, 216, 195, 0.68)";
    context.font = "11px Microsoft YaHei, sans-serif";
    context.fillText("敌方剑锋", ENEMY_POSITION.x - 25, ENEMY_POSITION.y - 18);

    context.strokeStyle = isWindowActive ? "#ff9f1a" : "#c9a063";
    context.lineWidth = isWindowActive ? 4 : 2;
    context.shadowColor = isWindowActive ? "#ff9f1a" : "#c9a063";
    context.shadowBlur = isWindowActive ? 22 : 8;
    context.beginPath();
    context.arc(PLAYER_POSITION.x, PLAYER_POSITION.y, 25, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;

    context.fillStyle = "#ff4500";
    context.beginPath();
    context.arc(PLAYER_POSITION.x, PLAYER_POSITION.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(224, 216, 195, 0.68)";
    context.fillText("玩家判定区", PLAYER_POSITION.x - 31, PLAYER_POSITION.y + 45);
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
