"use strict";

const PATTERN_VALIDATION = window.BladeTracePatternValidation;
const ATTACK_PATTERN_DATA = window.BladeTraceAttackPatterns;
if (!PATTERN_VALIDATION || !ATTACK_PATTERN_DATA) {
  throw new Error("BladeTrace requires its pattern validation and pattern data modules.");
}

const COMBAT_STATE = Object.freeze({
  IDLE: "IDLE",
  ATTACKING: "ATTACKING",
  PARRY_BOUNCE: "PARRY_BOUNCE",
  DEATHBLOW: "DEATHBLOW",
  VICTORY: "VICTORY",
  DEFEATED: "DEFEATED"
});

const PLAYER_POSITION = ATTACK_PATTERN_DATA.PLAYER_POSITION;
const BOSS_LIBRARY = ATTACK_PATTERN_DATA.BOSS_LIBRARY;
const MAX_VALUE = 100;
const PLAYER_HURTBOX_DEFAULT_RADIUS = PATTERN_VALIDATION.DEFAULTS.playerHurtboxRadius;
const PLAYER_BLADE = window.BladeTracePlayerBlade;

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
    this.samples = new window.BladeTraceCombatSamples();
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
    if (this.enabled) this.samples.play("combat.parry-success");
  }

  playAttackStart() {
    if (this.enabled) this.samples.play("combat.attack-start");
  }

  playBladeClash() {
    if (this.enabled) this.samples.play("combat.blade-clash");
  }

  stopSamples() {
    this.samples.stop();
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

  playPhaseShift() {
    const context = this.getContext();
    if (!context) return;

    const now = context.currentTime;
    this.playOscillator(context, "sine", 430, 980, 0.25, 0.34, now);
    this.playOscillator(context, "triangle", 690, 1320, 0.18, 0.28, now + 0.08);
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

const ATTACK_PATTERNS = ATTACK_PATTERN_DATA.ATTACK_PATTERNS;

const EDITOR_MIN_DURATION_MS = PATTERN_VALIDATION.CONSTRAINTS.minSegmentDurationMs;
const EDITOR_MIN_PLAYER_HURTBOX_RADIUS = PATTERN_VALIDATION.CONSTRAINTS.minPlayerHurtboxRadius;
const EDITOR_MAX_PLAYER_HURTBOX_RADIUS = PATTERN_VALIDATION.CONSTRAINTS.maxPlayerHurtboxRadius;
const EASING_NAMES = PATTERN_VALIDATION.EASING_NAMES;

function normalizePlayerHurtboxRadius(radius) {
  const numericRadius = Number(radius);
  const nextRadius = Number.isFinite(numericRadius) ? numericRadius : PLAYER_HURTBOX_DEFAULT_RADIUS;
  return clamp(Math.round(nextRadius), EDITOR_MIN_PLAYER_HURTBOX_RADIUS, EDITOR_MAX_PLAYER_HURTBOX_RADIUS);
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
    description: pattern.description,
    kind: pattern.kind,
    playerAttackReach: PLAYER_BLADE.config(pattern).reach,
    playerOutSpeed: PLAYER_BLADE.config(pattern).outSpeed,
    playerReturnSpeed: PLAYER_BLADE.config(pattern).returnSpeed,
    parryRadius: PLAYER_BLADE.config(pattern, normalizePlayerHurtboxRadius(pattern.playerHurtboxRadius)).parryRadius,
    damage: pattern.damage,
    postureGain: pattern.postureGain,
    playerHurtboxRadius: normalizePlayerHurtboxRadius(pattern.playerHurtboxRadius),
    commitCueLabel: pattern.commitCueLabel,
    commitCueLeadMs: pattern.commitCueLeadMs,
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

function cloneBossPhase(phase) {
  return {
    id: phase.id,
    name: phase.name,
    description: phase.description,
    postureThreshold: phase.postureThreshold,
    postureGainScale: phase.postureGainScale,
    accentColor: phase.accentColor,
    patternIds: phase.patternIds.slice()
  };
}

function cloneBoss(boss) {
  return {
    name: boss.name,
    description: boss.description,
    inspiration: {
      kind: boss.inspiration.kind,
      sourceGame: boss.inspiration.sourceGame,
      lesson: boss.inspiration.lesson
    },
    visualMotif: {
      type: boss.visualMotif.type,
      label: boss.visualMotif.label
    },
    phases: boss.phases.map(cloneBossPhase)
  };
}

function cloneBossLibrary(bosses) {
  const result = {};
  Object.keys(bosses).forEach(function (key) {
    result[key] = cloneBoss(bosses[key]);
  });
  return result;
}

function hexToRgba(hexColor, alpha) {
  const normalized = typeof hexColor === "string" ? hexColor.replace("#", "") : "c9a063";
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  if (![red, green, blue].every(Number.isFinite)) return "rgba(201, 160, 99, " + alpha + ")";
  return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
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
    this.playerBlade = new PLAYER_BLADE.Action();
    this.particles = new ParticleSystem();

    this.state = COMBAT_STATE.IDLE;
    this.playerHp = MAX_VALUE;
    this.enemyPosture = 0;
    this.patternLibrary = clonePatternLibrary(ATTACK_PATTERNS);
    this.originalPatternLibrary = clonePatternLibrary(ATTACK_PATTERNS);
    this.bossLibrary = cloneBossLibrary(BOSS_LIBRARY);
    this.originalBossLibrary = cloneBossLibrary(BOSS_LIBRARY);
    this.validateBuiltInPatternLibrary();
    this.validateBuiltInBossLibrary();
    this.currentBossKey = "cinder-warden";
    this.currentBoss = this.bossLibrary[this.currentBossKey];
    this.currentPhaseIndex = 0;
    this.selectedPhaseIndex = 0;
    this.pendingPhaseIndex = null;
    this.currentPatternKey = this.currentBoss.phases[0].patternIds[0];
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
    this.phaseTransitionTimer = null;
    this.isPhaseTransitioning = false;
    this.phasePracticeIndex = null;
    this.isEditorMode = false;
    this.selectedSegmentIndex = 0;
    this.draggedControl = null;

    this.initDom();
    this.populateBossSelect();
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    this.updatePatternDescription();
    this.bindEvents();
    this.resetCombat(false);
    window.requestAnimationFrame(this.loop.bind(this));
  }

  initDom() {
    this.bladeEditor=document.getElementById("blade-editor");
    this.bladeOutInput=document.getElementById("blade-out-speed");
    this.bladeReturnInput=document.getElementById("blade-return-speed");
    const change=()=>{
      this.currentPattern.playerOutSpeed=Math.max(1,Number(this.bladeOutInput.value)||900);
      this.currentPattern.playerReturnSpeed=Math.max(1,Number(this.bladeReturnInput.value)||600);
      this.playerBlade.reset();
    };
    this.bladeOutInput.addEventListener("change",change);
    this.bladeReturnInput.addEventListener("change",change);
    document.getElementById("blade-preview").addEventListener("click",()=>{
      if(this.isEditorMode)this.playerBlade.start(this.getBladePath(),this.getBladeSettings(),performance.now());
    });
    this.gameContainer = document.getElementById("game-container");
    this.enemyPostureBar = document.getElementById("enemy-posture-bar");
    this.enemyPostureText = document.getElementById("enemy-posture-text");
    this.bossName = document.getElementById("boss-name");
    this.bossPhaseLabel = document.getElementById("boss-phase-label");
    this.bossPersonality = document.getElementById("boss-personality");
    this.bossOrigin = document.getElementById("boss-origin");
    this.bossPhaseHint = document.getElementById("boss-phase-hint");
    this.playerHpBar = document.getElementById("player-hp-bar");
    this.playerHpText = document.getElementById("player-hp-text");
    this.playerStatus = document.getElementById("player-status");
    this.timingFeedback = document.getElementById("timing-feedback");
    this.windowIndicator = document.getElementById("window-indicator");
    this.telegraphIndicator = document.getElementById("telegraph-indicator");
    this.deathblowOverlay = document.getElementById("deathblow-overlay");
    this.deathblowButton = document.getElementById("btn-deathblow");
    this.bossSelect = document.getElementById("boss-select");
    this.bossSelectDescription = document.getElementById("boss-select-description");
    this.patternSelect = document.getElementById("pattern-select");
    this.patternDescription = document.getElementById("pattern-description");
    this.showWireframe = document.getElementById("show-wireframe");
    this.autoLoop = document.getElementById("auto-loop");
    this.soundToggle = document.getElementById("sound-toggle");
    this.attackButton = document.getElementById("btn-attack");
    this.parryButton = document.getElementById("btn-parry");
    this.resetButton = document.getElementById("btn-reset");
    this.editorEntryButton = document.getElementById("btn-editor");
    this.runtimeEditorBar = document.getElementById("runtime-editor-bar");
    this.runtimeEditorSelection = document.getElementById("runtime-editor-selection");
    this.runtimePhaseSelection = document.getElementById("runtime-phase-selection");
    this.runtimePhaseList = document.getElementById("runtime-phase-list");
    this.runtimePhaseAddButton = document.getElementById("btn-runtime-phase-add");
    this.runtimePhaseDeleteButton = document.getElementById("btn-runtime-phase-delete");
    this.runtimePhasePracticeButton = document.getElementById("btn-runtime-phase-practice");
    this.runtimeEditorSplitButton = document.getElementById("btn-runtime-editor-split");
    this.runtimeEditorDeleteButton = document.getElementById("btn-runtime-editor-delete");
    this.runtimeEditorAdvancedButton = document.getElementById("btn-runtime-editor-advanced");
    this.runtimeEditorExitButton = document.getElementById("btn-runtime-editor-exit");
    this.editorPanel = document.getElementById("editor-panel");
    this.editorCloseButton = document.getElementById("btn-editor-close");
    this.editorPhaseNameInput = document.getElementById("editor-phase-name");
    this.editorPhaseDescriptionInput = document.getElementById("editor-phase-description");
    this.editorPhaseAccentInput = document.getElementById("editor-phase-accent");
    this.editorPhaseThresholdRange = document.getElementById("editor-phase-threshold");
    this.editorPhaseThresholdInput = document.getElementById("editor-phase-threshold-number");
    this.editorPhaseThresholdValue = document.getElementById("editor-phase-threshold-value");
    this.editorPhasePatternList = document.getElementById("editor-phase-pattern-list");
    this.editorResetBossButton = document.getElementById("btn-editor-reset-boss");
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
    this.editorAddSegmentButton = document.getElementById("btn-editor-add-segment");
    this.editorDeleteSegmentButton = document.getElementById("btn-editor-delete-segment");
    this.editorResetPatternButton = document.getElementById("btn-editor-reset-pattern");
    this.enemyPostureProgress = document.querySelector(".posture-outer");
    this.playerHpProgress = document.querySelector(".hp-outer");
  }

  bindEvents() {
    this.attackButton.addEventListener("click", this.startAttack.bind(this));
    this.parryButton.addEventListener("click", this.handleParryInput.bind(this));
    this.resetButton.addEventListener("click", this.resetCombat.bind(this, true));
    this.deathblowButton.addEventListener("click", this.executeDeathblow.bind(this));

    this.bossSelect.addEventListener("change", this.handleBossChange.bind(this));
    this.patternSelect.addEventListener("change", this.handlePatternChange.bind(this));
    this.soundToggle.addEventListener("change", this.handleSoundChange.bind(this));
    this.editorEntryButton.addEventListener("click", this.toggleEditorMode.bind(this));
    this.runtimePhaseList.addEventListener("click", this.handlePhaseSelection.bind(this));
    this.runtimePhaseAddButton.addEventListener("click", this.addBossPhase.bind(this));
    this.runtimePhaseDeleteButton.addEventListener("click", this.deleteSelectedBossPhase.bind(this));
    this.runtimePhasePracticeButton.addEventListener("click", this.startSelectedPhasePractice.bind(this));
    this.runtimeEditorSplitButton.addEventListener("click", this.addSegmentAfterSelection.bind(this));
    this.runtimeEditorDeleteButton.addEventListener("click", this.deleteSelectedSegment.bind(this));
    this.runtimeEditorAdvancedButton.addEventListener("click", this.toggleAdvancedEditorPanel.bind(this));
    this.runtimeEditorExitButton.addEventListener("click", this.exitEditorMode.bind(this));
    this.editorCloseButton.addEventListener("click", this.exitEditorMode.bind(this));
    this.editorPhaseNameInput.addEventListener("input", this.handlePhaseNameInput.bind(this));
    this.editorPhaseDescriptionInput.addEventListener("input", this.handlePhaseDescriptionInput.bind(this));
    this.editorPhaseAccentInput.addEventListener("input", this.handlePhaseAccentInput.bind(this));
    this.editorPhaseThresholdRange.addEventListener("input", this.handlePhaseThresholdInput.bind(this));
    this.editorPhaseThresholdInput.addEventListener("change", this.handlePhaseThresholdInput.bind(this));
    this.editorPhasePatternList.addEventListener("click", this.handlePhasePatternToggle.bind(this));
    this.editorResetBossButton.addEventListener("click", this.resetCurrentBossEdits.bind(this));
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
    this.editorAddSegmentButton.addEventListener("click", this.addSegmentAfterSelection.bind(this));
    this.editorDeleteSegmentButton.addEventListener("click", this.deleteSelectedSegment.bind(this));
    this.editorResetPatternButton.addEventListener("click", this.resetCurrentPatternEdits.bind(this));
    this.canvas.addEventListener("pointerdown", this.handleCanvasPointerDown.bind(this));
    this.canvas.addEventListener("pointermove", this.handleCanvasPointerMove.bind(this));
    this.canvas.addEventListener("pointerup", this.handleCanvasPointerUp.bind(this));
    this.canvas.addEventListener("pointercancel", this.handleCanvasPointerUp.bind(this));

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  populateBossSelect() {
    this.bossSelect.replaceChildren();
    const groups = new Map();
    Object.keys(this.bossLibrary).forEach(function (bossKey) {
      const boss = this.bossLibrary[bossKey];
      const isHomage = boss.inspiration && boss.inspiration.kind === "mechanical-homage";
      const groupLabel = isHomage ? "机制致敬 · " + boss.inspiration.sourceGame : "BladeTrace 原创";
      let group = groups.get(groupLabel);
      if (!group) {
        group = document.createElement("optgroup");
        group.label = groupLabel;
        groups.set(groupLabel, group);
        this.bossSelect.append(group);
      }
      const option = document.createElement("option");
      option.value = bossKey;
      option.textContent = boss.name;
      group.append(option);
    }.bind(this));
    this.bossSelect.value = this.currentBossKey;
  }

  getBossOriginLabel() {
    const inspiration = this.currentBoss.inspiration;
    if (!inspiration) return "原创节奏研究 · BladeTrace";
    return inspiration.kind === "mechanical-homage"
      ? "机制致敬 · " + inspiration.sourceGame
      : "原创节奏研究 · " + inspiration.sourceGame;
  }

  getCombatPhaseIndex() {
    const resolution = PATTERN_VALIDATION.resolveBossPhase(this.currentBoss, this.enemyPosture);
    return resolution.phaseIndex < 0 ? 0 : resolution.phaseIndex;
  }

  getCombatPhase() {
    return this.currentBoss.phases[clamp(this.currentPhaseIndex, 0, this.currentBoss.phases.length - 1)];
  }

  getSelectedBossPhase() {
    this.selectedPhaseIndex = clamp(this.selectedPhaseIndex, 0, this.currentBoss.phases.length - 1);
    return this.currentBoss.phases[this.selectedPhaseIndex];
  }

  getActivePhase() {
    return this.isEditorMode ? this.getSelectedBossPhase() : this.getCombatPhase();
  }

  getPhasePracticePhase() {
    if (!Number.isInteger(this.phasePracticeIndex)) return null;
    return this.currentBoss.phases[this.phasePracticeIndex] || null;
  }

  isPhasePracticeActive() {
    return this.getPhasePracticePhase() !== null;
  }

  getCombatPostureGain() {
    return PATTERN_VALIDATION.calculatePhasePostureGain(this.getCombatPhase(), this.currentPattern);
  }

  getPhaseAccentColor() {
    const phase = this.getActivePhase();
    return phase && phase.accentColor ? phase.accentColor : "#c9a063";
  }

  setCurrentPattern(patternKey) {
    const nextPattern = this.patternLibrary[patternKey];
    if (!nextPattern) return false;
    this.currentPatternKey = patternKey;
    this.currentPattern = nextPattern;
    this.selectedSegmentIndex = 0;
    if (this.cursorPos) this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.updatePatternDescription();
    return true;
  }

  ensurePatternForPhase(phase) {
    if (!phase || !Array.isArray(phase.patternIds) || phase.patternIds.length === 0) return false;
    if (!phase.patternIds.includes(this.currentPatternKey)) return this.setCurrentPattern(phase.patternIds[0]);
    return true;
  }

  rebuildPatternSelect() {
    const phase = this.getActivePhase();
    if (!phase) return;
    this.ensurePatternForPhase(phase);
    this.patternSelect.replaceChildren();
    phase.patternIds.forEach(function (patternKey) {
      const pattern = this.patternLibrary[patternKey];
      if (!pattern) return;
      const option = document.createElement("option");
      option.value = patternKey;
      option.textContent = pattern.name;
      this.patternSelect.append(option);
    }.bind(this));
    this.patternSelect.value = this.currentPatternKey;
  }

  handleBossChange(event) {
    const nextBoss = this.bossLibrary[event.target.value];
    if (!nextBoss || this.state !== COMBAT_STATE.IDLE) return;

    this.currentBossKey = event.target.value;
    this.currentBoss = nextBoss;
    this.phasePracticeIndex = null;
    this.clearPhaseTransition();
    this.currentPhaseIndex = 0;
    this.selectedPhaseIndex = 0;
    this.pendingPhaseIndex = null;
    this.ensurePatternForPhase(this.currentBoss.phases[0]);
    this.resetCombat(false);
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    if (this.isEditorMode) {
      this.renderEditor();
      this.setStatus("正在编辑「" + this.currentBoss.name + "」的阶段与招式", "neutral");
    } else {
      this.setStatus("已选择 Boss「" + this.currentBoss.name + "」", "neutral");
    }
  }

  handlePatternChange(event) {
    const activePhase = this.getActivePhase();
    if (!this.patternLibrary[event.target.value] || !activePhase.patternIds.includes(event.target.value) || this.state !== COMBAT_STATE.IDLE) {
      this.rebuildPatternSelect();
      return;
    }
    this.setCurrentPattern(event.target.value);
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
    if (!this.audio.enabled) this.audio.stopSamples();
    this.setStatus(event.target.checked ? "音效已开启" : "音效已关闭", "neutral");
  }

  toggleEditorMode() {
    this.playerBlade.reset();
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
    this.playerBlade.reset();
    this.clearAutoStart();
    if (this.state !== COMBAT_STATE.IDLE) this.resetCombat(false);

    this.isEditorMode = true;
    this.selectedPhaseIndex = this.currentPhaseIndex;
    this.ensurePatternForPhase(this.getSelectedBossPhase());
    this.rebuildPatternSelect();
    this.selectedSegmentIndex = clamp(this.selectedSegmentIndex, 0, this.currentPattern.segments.length - 1);
    this.editorPanel.classList.add("hidden");
    this.runtimeEditorBar.classList.remove("hidden");
    this.editorEntryButton.textContent = "退出画布编辑";
    this.editorEntryButton.setAttribute("aria-pressed", "true");
    this.runtimeEditorAdvancedButton.setAttribute("aria-expanded", "false");
    this.runtimeEditorAdvancedButton.textContent = "更多参数";
    this.canvas.classList.add("is-editing");
    this.canvas.setAttribute("aria-label", "画布编辑。可点击曲线选择段落，拖动 P0 到 P3 控制点修改路径，拖动玩家受击圆环调整半径，拖动虚线圈边缘调整弹反半径，拖动青色端点调整攻击范围。");
    this.canvas.setAttribute("aria-describedby", "runtime-editor-help");
    this.updateBossPresentation();
    this.renderEditor();
    this.updateControls();
    this.setStatus("画布编辑已开启 · 拖虚线圈调弹反半径，点选我方刀锋调速度", "warning");
    this.showFeedback("CANVAS EDITOR", "neutral");
  }

  exitEditorMode() {
    if (!this.isEditorMode) return;

    this.phasePracticeIndex = null;
    this.leaveEditorModeUi();
    this.setStatus("已退出编辑模式 · 修改仍保留到刷新页面", "neutral");
  }

  leaveEditorModeUi() {
    this.playerBlade.reset();
    this.bladeEditor.hidden=true;
    this.draggedControl = null;
    this.isEditorMode = false;
    this.selectedPhaseIndex = this.currentPhaseIndex;
    this.ensurePatternForPhase(this.getCombatPhase());
    this.rebuildPatternSelect();
    this.editorPanel.classList.add("hidden");
    this.runtimeEditorBar.classList.add("hidden");
    this.editorEntryButton.textContent = "进入画布编辑";
    this.editorEntryButton.setAttribute("aria-pressed", "false");
    this.runtimeEditorAdvancedButton.setAttribute("aria-expanded", "false");
    this.runtimeEditorAdvancedButton.textContent = "更多参数";
    this.canvas.classList.remove("is-editing", "is-dragging");
    this.canvas.setAttribute("aria-label", "敌方剑锋沿贝塞尔轨迹接近玩家受击区的战斗可视化");
    this.canvas.removeAttribute("aria-describedby");
    this.updateBossPresentation();
    this.updateControls();
  }

  startSelectedPhasePractice() {
    if (!this.isEditorMode) return;

    const practiceIndex = this.selectedPhaseIndex;
    const phase = this.getSelectedBossPhase();
    this.phasePracticeIndex = practiceIndex;
    this.enemyPosture = phase.postureThreshold;
    this.currentPhaseIndex = practiceIndex;
    this.selectedPhaseIndex = practiceIndex;
    this.pendingPhaseIndex = null;
    this.leaveEditorModeUi();
    this.updateHud();
    this.setStatus("阶段练习 · 已从「" + phase.name + "」开始；重置或受击会回到该阶段", "success");
    this.showFeedback("PHASE PRACTICE · " + phase.name, "success");
  }

  renderEditor() {
    if (!this.isEditorMode) return;

    this.renderRuntimePhaseList();
    this.refreshPhaseEditorForm();
    this.renderPhasePatternList();
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
  }

  updateRuntimeEditorBar() {
    if (!this.isEditorMode) return;

    const segment = this.getSelectedSegment();
    const validation = this.getCurrentPatternValidation();
    const bossValidation = this.getCurrentBossValidation();
    const validationLabel = validation.isValid
      ? (validation.warnings.length > 0 ? " · 终点落空" : " · 配置有效")
      : " · 配置待修正";
    const bossLabel = bossValidation.isValid ? "阶段有效" : "阶段待修正";
    this.runtimeEditorSelection.textContent = "画布编辑 · " + this.currentBoss.name + " · " + this.getSelectedBossPhase().name + " · 第 " + (this.selectedSegmentIndex + 1) + "/" + this.currentPattern.segments.length + " 段 · " + segment.label +  " · 弹反圈 " + this.getBladeSettings().parryRadius + "px · " + bossLabel + validationLabel;
    this.runtimeEditorSplitButton.disabled = !segment;
    this.runtimeEditorDeleteButton.disabled = this.currentPattern.segments.length <= 1;
  }

  validateBuiltInPatternLibrary() {
    const validation = PATTERN_VALIDATION.validatePatternLibrary(this.patternLibrary, {
      playerPosition: PLAYER_POSITION,
      supportedEasings: EASING_NAMES
    });
    if (!validation.isValid) {
      throw new Error("BladeTrace 内置招式配置无效：" + validation.errors.map(function (error) { return error.message; }).join("；"));
    }
  }

  validateBuiltInBossLibrary() {
    const validation = PATTERN_VALIDATION.validateBossLibrary(this.bossLibrary, this.patternLibrary);
    if (!validation.isValid) {
      throw new Error("BladeTrace 内置 Boss 配置无效：" + validation.errors.map(function (error) { return error.message; }).join("；"));
    }
  }

  getCurrentBossValidation() {
    const singleBoss = {};
    singleBoss[this.currentBossKey] = this.currentBoss;
    return PATTERN_VALIDATION.validateBossLibrary(singleBoss, this.patternLibrary);
  }

  updateBossPresentation() {
    const phase = this.getActivePhase();
    if (!phase) return;
    const phaseIndex = this.isEditorMode ? this.selectedPhaseIndex : this.currentPhaseIndex;
    this.bossName.textContent = this.currentBoss.name;
    this.bossPersonality.textContent = this.currentBoss.description;
    this.bossOrigin.textContent = this.getBossOriginLabel();
    this.bossPhaseLabel.textContent = (this.isEditorMode ? "PREVIEW " : "PHASE ") + phase.name;
    this.bossPhaseHint.textContent = phase.description;
    this.gameContainer.style.setProperty("--phase-accent", phase.accentColor);
    this.gameContainer.style.setProperty("--phase-accent-soft", hexToRgba(phase.accentColor, 0.22));
    this.bossSelect.value = this.currentBossKey;
    this.bossSelectDescription.textContent = this.currentBoss.inspiration.lesson;
    if (this.isEditorMode) {
      this.runtimePhaseSelection.textContent = "正在预览第 " + (phaseIndex + 1) + " 阶段 · " + phase.name + " · 点击阶段卡立即切换画布和招式池；也可直接练习此阶段。";
    }
  }

  renderRuntimePhaseList() {
    this.runtimePhaseList.replaceChildren();
    this.currentBoss.phases.forEach(function (phase, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "runtime-phase-button";
      button.dataset.phaseIndex = String(index);
      button.style.setProperty("--phase-card-accent", phase.accentColor);
      button.setAttribute("aria-pressed", String(index === this.selectedPhaseIndex));
      if (index === this.selectedPhaseIndex) button.classList.add("is-selected");

      const title = document.createElement("span");
      title.className = "runtime-phase-button__title";
      title.textContent = phase.name;
      const detail = document.createElement("span");
      detail.className = "runtime-phase-button__detail";
      detail.textContent = "架势 " + phase.postureThreshold + "% · 推进 ×" + phase.postureGainScale + " · " + phase.patternIds.length + " 招";
      button.append(title, detail);
      this.runtimePhaseList.append(button);
    }.bind(this));
  }

  getPhaseThresholdBounds(index) {
    const phases = this.currentBoss.phases;
    if (index === 0) return { minimum: 0, maximum: 0 };
    return {
      minimum: phases[index - 1].postureThreshold + 1,
      maximum: index === phases.length - 1
        ? PATTERN_VALIDATION.CONSTRAINTS.maxPhasePostureThreshold
        : phases[index + 1].postureThreshold - 1
    };
  }

  refreshPhaseEditorForm() {
    const phase = this.getSelectedBossPhase();
    const bounds = this.getPhaseThresholdBounds(this.selectedPhaseIndex);
    const isFirstPhase = this.selectedPhaseIndex === 0;
    this.editorPhaseNameInput.value = phase.name;
    this.editorPhaseDescriptionInput.value = phase.description;
    this.editorPhaseAccentInput.value = phase.accentColor;
    this.editorPhaseThresholdRange.min = String(bounds.minimum);
    this.editorPhaseThresholdRange.max = String(bounds.maximum);
    this.editorPhaseThresholdRange.value = String(phase.postureThreshold);
    this.editorPhaseThresholdRange.disabled = isFirstPhase;
    this.editorPhaseThresholdInput.min = String(bounds.minimum);
    this.editorPhaseThresholdInput.max = String(bounds.maximum);
    this.editorPhaseThresholdInput.value = String(phase.postureThreshold);
    this.editorPhaseThresholdInput.disabled = isFirstPhase;
    this.editorPhaseThresholdValue.textContent = phase.postureThreshold + "%";
    this.editorResetBossButton.disabled = false;
  }

  renderPhasePatternList() {
    const phase = this.getSelectedBossPhase();
    this.editorPhasePatternList.replaceChildren();
    Object.keys(this.patternLibrary).forEach(function (patternKey) {
      const pattern = this.patternLibrary[patternKey];
      const isIncluded = phase.patternIds.includes(patternKey);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-phase-pattern-button";
      button.dataset.phasePatternId = patternKey;
      button.setAttribute("aria-pressed", String(isIncluded));
      if (isIncluded) button.classList.add("is-selected");

      const title = document.createElement("span");
      title.className = "editor-phase-pattern-button__title";
      title.textContent = pattern.name;
      const detail = document.createElement("span");
      detail.className = "editor-phase-pattern-button__detail";
      detail.textContent = isIncluded ? "已加入当前阶段" : pattern.description;
      button.append(title, detail);
      this.editorPhasePatternList.append(button);
    }.bind(this));
  }

  handlePhaseSelection(event) {
    const button = event.target.closest("button[data-phase-index]");
    if (!button || !this.isEditorMode) return;
    this.selectBossPhase(Number(button.dataset.phaseIndex));
  }

  selectBossPhase(index) {
    this.playerBlade.reset();
    this.bladeEditor.hidden = true;
    if (!this.isEditorMode || !Number.isInteger(index) || index < 0 || index >= this.currentBoss.phases.length) return;
    this.selectedPhaseIndex = index;
    this.ensurePatternForPhase(this.getSelectedBossPhase());
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    this.renderEditor();
    this.setStatus("正在预览「" + this.getSelectedBossPhase().name + "」· 画布与招式池已切换", "neutral");
  }

  handlePhaseNameInput(event) {
    const phase = this.getSelectedBossPhase();
    phase.name = event.target.value.trim() || "未命名阶段";
    this.updateBossPresentation();
    this.renderRuntimePhaseList();
    this.updateRuntimeEditorBar();
  }

  handlePhaseDescriptionInput(event) {
    const phase = this.getSelectedBossPhase();
    phase.description = event.target.value.trim() || "请为该阶段补充练习提示。";
    this.updateBossPresentation();
    this.updateRuntimeEditorBar();
  }

  handlePhaseAccentInput(event) {
    const phase = this.getSelectedBossPhase();
    const color = event.target.value;
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    phase.accentColor = color;
    this.updateBossPresentation();
    this.renderRuntimePhaseList();
  }

  handlePhaseThresholdInput(event) {
    if (this.selectedPhaseIndex === 0 || event.target.value === "") return;
    const numericThreshold = Math.round(Number(event.target.value));
    if (!Number.isFinite(numericThreshold)) return;
    const bounds = this.getPhaseThresholdBounds(this.selectedPhaseIndex);
    const phase = this.getSelectedBossPhase();
    phase.postureThreshold = clamp(numericThreshold, bounds.minimum, bounds.maximum);
    this.refreshPhaseEditorForm();
    this.renderRuntimePhaseList();
    this.updateRuntimeEditorBar();
  }

  handlePhasePatternToggle(event) {
    const button = event.target.closest("button[data-phase-pattern-id]");
    if (!button || !this.isEditorMode) return;
    const phase = this.getSelectedBossPhase();
    const patternKey = button.dataset.phasePatternId;
    const existingIndex = phase.patternIds.indexOf(patternKey);
    if (existingIndex >= 0) {
      if (phase.patternIds.length <= 1) {
        this.showFeedback("PHASE NEEDS ONE ATTACK", "danger");
        this.setStatus("每个阶段至少保留一招", "danger");
        return;
      }
      phase.patternIds.splice(existingIndex, 1);
    } else {
      phase.patternIds.push(patternKey);
    }

    this.ensurePatternForPhase(phase);
    this.rebuildPatternSelect();
    this.renderEditor();
    this.updateBossPresentation();
  }

  createBossPhaseId() {
    let suffix = this.currentBoss.phases.length + 1;
    let id = "custom-phase-" + suffix;
    const existingIds = new Set(this.currentBoss.phases.map(function (phase) { return phase.id; }));
    while (existingIds.has(id)) {
      suffix += 1;
      id = "custom-phase-" + suffix;
    }
    return id;
  }

  addBossPhase() {
    if (!this.isEditorMode) return;
    const phases = this.currentBoss.phases;
    if (phases.length >= PATTERN_VALIDATION.CONSTRAINTS.maxBossPhases) {
      this.showFeedback("MAX PHASES REACHED", "danger");
      this.setStatus("当前 Boss 最多支持 " + PATTERN_VALIDATION.CONSTRAINTS.maxBossPhases + " 个阶段", "danger");
      return;
    }

    const lastPhase = phases[phases.length - 1];
    const nextThreshold = Math.min(PATTERN_VALIDATION.CONSTRAINTS.maxPhasePostureThreshold, lastPhase.postureThreshold + 10);
    if (nextThreshold <= lastPhase.postureThreshold) {
      this.showFeedback("NO PHASE THRESHOLD LEFT", "danger");
      return;
    }

    const accents = ["#c98744", "#5a8bb5", "#a26ab7", "#d85e36", "#6aa98b"];
    phases.push({
      id: this.createBossPhaseId(),
      name: "新增阶段",
      description: "为这个阶段补充节奏意图与练习提示。",
      postureThreshold: nextThreshold,
      postureGainScale: Number.isFinite(lastPhase.postureGainScale) ? lastPhase.postureGainScale : 0.5,
      accentColor: accents[phases.length % accents.length],
      patternIds: [this.currentPatternKey]
    });
    this.selectedPhaseIndex = phases.length - 1;
    this.ensurePatternForPhase(this.getSelectedBossPhase());
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    this.renderEditor();
    this.showFeedback("PHASE ADDED", "success");
    this.setStatus("已新增阶段 · 可直接在画布预览与调整", "success");
  }

  deleteSelectedBossPhase() {
    if (!this.isEditorMode) return;
    const phases = this.currentBoss.phases;
    if (phases.length <= PATTERN_VALIDATION.CONSTRAINTS.minBossPhases) {
      this.showFeedback("BOSS NEEDS TWO PHASES", "danger");
      this.setStatus("Boss 至少保留 " + PATTERN_VALIDATION.CONSTRAINTS.minBossPhases + " 个阶段", "danger");
      return;
    }

    const removedIndex = this.selectedPhaseIndex;
    phases.splice(removedIndex, 1);
    if (removedIndex === 0) phases[0].postureThreshold = 0;
    this.currentPhaseIndex = Math.min(this.currentPhaseIndex, phases.length - 1);
    this.selectedPhaseIndex = Math.min(removedIndex, phases.length - 1);
    this.ensurePatternForPhase(this.getSelectedBossPhase());
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    this.renderEditor();
    this.showFeedback("PHASE REMOVED", "danger");
    this.setStatus("阶段已删除 · 其余阶段阈值保持递增", "neutral");
  }

  resetCurrentBossEdits() {
    this.bossLibrary[this.currentBossKey] = cloneBoss(this.originalBossLibrary[this.currentBossKey]);
    this.currentBoss = this.bossLibrary[this.currentBossKey];
    this.currentPhaseIndex = this.getCombatPhaseIndex();
    this.selectedPhaseIndex = this.currentPhaseIndex;
    this.pendingPhaseIndex = null;
    this.ensurePatternForPhase(this.getSelectedBossPhase());
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    this.renderEditor();
    this.showFeedback("BOSS PHASES RESTORED", "neutral");
    this.setStatus("当前 Boss 的阶段结构已恢复为本页初始配置", "neutral");
  }

  applyCombatPhaseFromPosture() {
    const nextPhaseIndex = this.getCombatPhaseIndex();
    if (nextPhaseIndex === this.currentPhaseIndex) return false;
    this.currentPhaseIndex = nextPhaseIndex;
    if (this.isEditorMode) return true;

    this.ensurePatternForPhase(this.getCombatPhase());
    this.rebuildPatternSelect();
    this.updateBossPresentation();
    return true;
  }

  getCurrentPatternValidation() {
    return PATTERN_VALIDATION.validateAttackPattern(this.currentPattern, {
      playerPosition: PLAYER_POSITION,
      supportedEasings: EASING_NAMES
    });
  }

  ensureCurrentPatternCanStart() {
    const bossValidation = this.getCurrentBossValidation();
    if (!bossValidation.isValid) {
      this.setStatus("Boss 阶段配置需要修正 · " + bossValidation.errors[0].message, "danger");
      this.showFeedback("BOSS INVALID", "danger");
      return false;
    }

    const validation = this.getCurrentPatternValidation();
    if (validation.isValid) return true;

    this.setStatus("招式配置需要修正 · " + validation.errors[0].message, "danger");
    this.showFeedback("PATTERN INVALID", "danger");
    return false;
  }

  updatePatternDescription() {
    if (!this.patternDescription) return;
    this.patternDescription.textContent = this.currentPattern.description;
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
    this.currentPattern.parryRadius = this.getBladeSettings().parryRadius;
    this.playerBlade.reset();
    this.updateRuntimeEditorBar();
  }

  setSegmentPoint(segmentIndex, pointKey, point) {
    this.playerBlade.reset();
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
    this.updateRuntimeEditorBar();
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
    const path = this.getBladePath(), settings = this.getBladeSettings();
    const bladePoint = this.playerBlade.path ? this.playerBlade.position(performance.now()) : PLAYER_POSITION;
    if (Math.hypot(point.x-bladePoint.x,point.y-bladePoint.y)<16) {
      this.bladeEditor.hidden = false;
      this.bladeOutInput.value = settings.outSpeed;
      this.bladeReturnInput.value = settings.returnSpeed;
      return;
    }
    this.bladeEditor.hidden = true;
    const reachPoint = PLAYER_BLADE.at(path,settings.reach);
    const kind = Math.hypot(point.x-reachPoint.x,point.y-reachPoint.y)<14 ? "blade-reach"
      : Math.abs(Math.hypot(point.x-PLAYER_POSITION.x,point.y-PLAYER_POSITION.y)-settings.parryRadius)<6 ? "parry-radius" : null;
    if(kind) {
      this.playerBlade.reset();
      this.draggedControl={kind,pointerId:event.pointerId};
      this.canvas.setPointerCapture(event.pointerId);
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
    if (this.draggedControl.kind === "blade-reach") {
      const path=this.getBladePath();
      let best=Infinity, distance=0;
      for(const sample of path.points) {
        const d=Math.hypot(point.x-sample.x,point.y-sample.y);
        if(d<best){best=d;distance=sample.distance;}
      }
      this.currentPattern.playerAttackReach=Math.max(1,distance);
      this.updateRuntimeEditorBar();
    } else if(this.draggedControl.kind === "parry-radius") {
      this.currentPattern.parryRadius=Math.max(this.getPlayerHurtbox().radius+10,Math.hypot(point.x-PLAYER_POSITION.x,point.y-PLAYER_POSITION.y));
      this.updateRuntimeEditorBar();
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
    if (event.repeat) { event.preventDefault(); return; }
    if (/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || "")) return;

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
    if (this.isEditorMode || this.isPhaseTransitioning || this.state !== COMBAT_STATE.IDLE) return;
    this.ensurePatternForPhase(this.getCombatPhase());
    if (!this.ensureCurrentPatternCanStart()) return;

    this.clearAutoStart();
    this.state = COMBAT_STATE.ATTACKING;
    this.audio.playAttackStart();
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
    const now=performance.now();
    if(this.state===COMBAT_STATE.ATTACKING)this.advanceAttack(now,true);
    this.playerBlade.advance(now);
    if (this.playerBlade.state !== "idle") return;
    if (this.state === COMBAT_STATE.DEATHBLOW) { this.executeDeathblow(); return; }
    if (this.state !== COMBAT_STATE.ATTACKING) return;
    this.playerBlade.start(this.getBladePath(),this.getBladeSettings(),now);
    this.updateControls();
  }

  triggerParrySuccess() {
    this.state = COMBAT_STATE.PARRY_BOUNCE;
    const postureGain = this.getCombatPostureGain();
    this.enemyPosture = clamp(this.enemyPosture + postureGain, 0, MAX_VALUE);
    this.pendingPhaseIndex = this.getCombatPhaseIndex();
    this.particles.spawnSparks(this.cursorPos.x, this.cursorPos.y, 42);
    this.screenShake = Math.max(this.screenShake, 13);
    this.audio.playDeflect();
    this.showFeedback("PERFECT PARRY · 完美弹反", "success");
    this.setStatus("弹反成功 · 敌方架势 +" + postureGain + "%", "success");
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
    const practicePhase = this.getPhasePracticePhase();
    this.enemyPosture = practicePhase ? practicePhase.postureThreshold : 0;
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
      this.applyCombatPhaseFromPosture();
      const resetLabel = practicePhase
        ? "受击 · 阶段练习回到「" + this.getCombatPhase().name + "」"
        : "受击 · 敌方架势已清空，回到「" + this.getCombatPhase().name + "」";
      this.setStatus(resetLabel, "danger");
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
      this.pendingPhaseIndex = null;
      this.enterDeathblowState();
      return;
    }

    const phaseChanged = this.pendingPhaseIndex !== null && this.applyCombatPhaseFromPosture();
    this.pendingPhaseIndex = null;

    this.state = COMBAT_STATE.IDLE;
    if (phaseChanged) {
      const phase = this.getCombatPhase();
      this.beginPhaseTransition(phase);
    } else {
      this.setStatus("交锋结束 · 可继续观察下一招", "neutral");
    }
    this.updateControls();
    this.updateWindowIndicator();
    if (!phaseChanged) this.scheduleAutoStart(900);
  }

  beginPhaseTransition(phase) {
    this.clearPhaseTransition();
    this.isPhaseTransitioning = true;
    this.audio.playPhaseShift();
    this.showFeedback("PHASE " + (this.currentPhaseIndex + 1) + " · " + phase.name, "warning");
    this.setStatus("阶段转场 · Boss 进入「" + phase.name + "」，准备阅读新节拍", "success");
    this.updateControls();
    this.phaseTransitionTimer = window.setTimeout(function () {
      this.isPhaseTransitioning = false;
      this.phaseTransitionTimer = null;
      this.updateControls();
      this.scheduleAutoStart(650);
    }.bind(this), 650);
  }

  clearPhaseTransition() {
    if (this.phaseTransitionTimer !== null) {
      window.clearTimeout(this.phaseTransitionTimer);
      this.phaseTransitionTimer = null;
    }
    this.isPhaseTransitioning = false;
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
    this.playerBlade.reset();
    if(this.bladeEditor)this.bladeEditor.hidden=true;
    this.audio.stopSamples();
    this.clearAutoStart();
    this.clearPhaseTransition();
    this.state = COMBAT_STATE.IDLE;
    this.playerHp = MAX_VALUE;
    const practicePhase = this.getPhasePracticePhase();
    this.enemyPosture = practicePhase ? practicePhase.postureThreshold : 0;
    this.pendingPhaseIndex = null;
    this.elapsedMs = 0;
    this.totalDurationMs = 0;
    this.currentSegmentIndex = 0;
    this.cursorPos = clonePoint(this.getPatternStartPoint());
    this.cursorTrail = [];
    this.bounce = null;
    this.screenShake = 0;
    this.particles.clear();
    this.deathblowOverlay.classList.add("hidden");
    this.currentPhaseIndex = this.getCombatPhaseIndex();
    if (!this.isEditorMode) {
      this.selectedPhaseIndex = this.currentPhaseIndex;
      this.ensurePatternForPhase(this.getCombatPhase());
      this.rebuildPatternSelect();
    }
    this.updateBossPresentation();
    this.updateHud();
    this.updateControls();
    this.updateWindowIndicator();
    this.setStatus(practicePhase
      ? "阶段练习 · 已回到「" + this.getCombatPhase().name + "」· Space 发起攻击"
      : "准备就绪 · Space 发起攻击", "neutral");
    if (announce) this.showFeedback("BATTLE RESET · 战斗已重置", "neutral");
  }

  scheduleAutoStart(delayMs) {
    if (this.isEditorMode || this.isPhaseTransitioning || !this.autoLoop.checked || this.state !== COMBAT_STATE.IDLE) return;
    this.clearAutoStart();
    this.autoStartTimer = window.setTimeout(function () {
      this.autoStartTimer = null;
      this.prepareNextAutoPattern();
      this.startAttack();
    }.bind(this), delayMs);
  }

  prepareNextAutoPattern() {
    const phase = this.getCombatPhase();
    if (!phase || phase.patternIds.length < 2) return;
    const currentIndex = phase.patternIds.indexOf(this.currentPatternKey);
    const nextPatternKey = phase.patternIds[(currentIndex + 1 + phase.patternIds.length) % phase.patternIds.length];
    if (nextPatternKey === this.currentPatternKey) return;
    this.setCurrentPattern(nextPatternKey);
    this.rebuildPatternSelect();
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
    const end=Math.min(timestamp,this.startTime+this.totalDurationMs);
    let time=this.startTime+this.elapsedMs;
    const blade=this.playerBlade;
    // Bound both blades' displacement to 2px per sweep, even at edited high speeds.
    // Cubic derivative <= 3 * longest control edge; every supported easing slope <= 8.
    const enemySpeedBound=Math.max(...this.currentPattern.segments.map(s=>
      24*Math.max(Math.hypot(s.p1.x-s.p0.x,s.p1.y-s.p0.y),Math.hypot(s.p2.x-s.p1.x,s.p2.y-s.p1.y),Math.hypot(s.p3.x-s.p2.x,s.p3.y-s.p2.y))/s.durationMs));
    while(time<end && this.state===COMBAT_STATE.ATTACKING) {
      blade.advance(time);
      const step=blade.state==="outbound"?Math.max(Number.EPSILON*Math.max(1,Math.abs(time))*2,Math.min(1,2/(enemySpeedBound+blade.settings.outSpeed/1000))):1;
      const next=Math.min(end,time+step,blade.state==="outbound"?blade.endTime:Infinity);
      const enemyA=this.evaluateTrajectory(time-this.startTime).position;
      const enemyB=this.evaluateTrajectory(next-this.startTime).position;
      if(blade.state==="outbound" && time>=blade.startTime) {
        const playerA=blade.position(time),playerB=blade.position(next);
        const fraction=PLAYER_BLADE.sweep(playerA,playerB,enemyA,enemyB);
        if(fraction!==null) {
          const contactTime=time+(next-time)*fraction;
          const enemy=interpolatePoint(enemyA,enemyB,fraction);
          const player=interpolatePoint(playerA,playerB,fraction);
          const contact=interpolatePoint(enemy,player,0.5);
          this.cursorPos=enemy;
          this.elapsedMs=contactTime-this.startTime;
          blade.returnAt(contactTime);
          if(Math.hypot(contact.x-PLAYER_POSITION.x,contact.y-PLAYER_POSITION.y)<=blade.settings.parryRadius+1e-7) this.triggerParrySuccess();
          else this.triggerBladeClash();
          this.bounce.startTime=contactTime;
          break;
        }
      }
      time=next;
      this.elapsedMs=time-this.startTime;
      this.cursorPos=enemyB;
      this.currentSegmentIndex=this.evaluateTrajectory(this.elapsedMs).segmentIndex;
    }
    this.cursorTrail.push({...this.cursorPos});
    if(this.cursorTrail.length>20)this.cursorTrail.shift();
    if(resolveHit && this.state===COMBAT_STATE.ATTACKING && end>=this.startTime+this.totalDurationMs)this.resolveAttackImpact();
    blade.advance(timestamp);
  }

  triggerBladeClash() {
    if(this.state!==COMBAT_STATE.ATTACKING)return;
    this.state=COMBAT_STATE.PARRY_BOUNCE;
    this.pendingPhaseIndex=null;
    this.audio.playBladeClash();
    this.particles.spawnSparks(this.cursorPos.x,this.cursorPos.y,20);
    this.showFeedback("BLADE CLASH · 普通拼刀","neutral");
    this.setStatus("普通拼刀 · 抵挡伤害，架势不变","neutral");
    const start=this.getPatternStartPoint();
    this.bounce={startX:this.cursorPos.x,startY:this.cursorPos.y,endX:start.x,endY:start.y,startTime:performance.now(),durationMs:250};
    this.updateControls();
  }

  getBladeSettings() {
    const settings=PLAYER_BLADE.config(this.currentPattern,this.getPlayerHurtbox().radius);
    return settings;
  }

  getBladePath() {
    const key=JSON.stringify(this.currentPattern.segments.map(s=>[s.p0,s.p1,s.p2,s.p3]));
    if(this.bladePathKey!==key){this.bladePathKey=key;this.bladePathCache=PLAYER_BLADE.path(this.currentPattern,PLAYER_POSITION);}
    return this.bladePathCache;
  }

  updateHud() {
    this.enemyPostureBar.style.width = this.enemyPosture + "%";
    this.enemyPostureText.textContent = this.enemyPosture + "%";
    this.playerHpBar.style.width = this.playerHp + "%";
    this.playerHpText.textContent = "HP " + this.playerHp + " / " + MAX_VALUE;
    this.enemyPostureProgress.setAttribute("aria-valuenow", String(this.enemyPosture));
    this.playerHpProgress.setAttribute("aria-valuenow", String(this.playerHp));
  }

  updateControls() {
    const isIdle = this.state === COMBAT_STATE.IDLE && !this.isPhaseTransitioning;
    const canUseEditor = isIdle || this.isEditorMode;
    const canParry = this.playerBlade.state === "idle" && !this.isEditorMode && (this.state === COMBAT_STATE.ATTACKING || this.state === COMBAT_STATE.DEATHBLOW);
    this.attackButton.disabled = !isIdle || this.isEditorMode;
    this.parryButton.disabled = !canParry;
    this.parryButton.textContent=this.playerBlade.state==="outbound"?"出刀阶段":this.playerBlade.state==="return"?"收刀后摇":"挥刀 / 弹反";
    this.bossSelect.disabled = !isIdle;
    this.patternSelect.disabled = !isIdle;
    this.autoLoop.disabled = this.isEditorMode;
    this.editorEntryButton.disabled = !canUseEditor;
    this.runtimeEditorSplitButton.disabled = !this.isEditorMode;
    this.runtimeEditorDeleteButton.disabled = !this.isEditorMode || this.currentPattern.segments.length <= 1;
    this.runtimeEditorAdvancedButton.disabled = !this.isEditorMode;
    this.runtimeEditorExitButton.disabled = !this.isEditorMode;
    this.runtimePhaseAddButton.disabled = !this.isEditorMode || this.currentBoss.phases.length >= PATTERN_VALIDATION.CONSTRAINTS.maxBossPhases;
    this.runtimePhaseDeleteButton.disabled = !this.isEditorMode || this.currentBoss.phases.length <= PATTERN_VALIDATION.CONSTRAINTS.minBossPhases;
    this.runtimePhasePracticeButton.disabled = !this.isEditorMode;
  }

  getCommitCueLeadMs() {
    return clamp(Number(this.currentPattern.commitCueLeadMs)||400,1,this.totalDurationMs||this.calculateTotalDuration());
  }

  getCommitCueLabel() {
    return this.currentPattern.commitCueLabel || "终结段承诺";
  }

  isCommitCueActive(remainingMs) {
    const remaining=Number.isFinite(remainingMs)?remainingMs:this.totalDurationMs-this.elapsedMs;
    return this.state===COMBAT_STATE.ATTACKING && remaining>0 && remaining<=this.getCommitCueLeadMs();
  }

  updateWindowIndicator() {
    const active=this.playerBlade.state==="outbound";
    this.windowIndicator.textContent="弹反圈 "+Math.round(this.getBladeSettings().parryRadius)+"px · "+(active?"出刀阶段":this.playerBlade.state==="return"?"收刀后摇":"可出刀");
    this.windowIndicator.dataset.active=String(active);
    const cue=this.isCommitCueActive();
    this.telegraphIndicator.textContent=cue?"预读信号 · "+this.getCommitCueLabel():"预读提示独立于空间弹反圈";
    this.telegraphIndicator.dataset.active=String(cue);
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

    this.playerBlade.advance(timestamp);
    this.updateControls();
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
    this.drawBossSignature(context);
    if (this.showWireframe.checked || this.isEditorMode) this.drawWireframe(context);
    this.drawCombatAnchors(context);
    this.drawCursorTrail(context);
    this.drawCursor(context);
    this.drawPlayerBlade(context);
    this.drawCommitCue(context);
    this.drawPhaseTransitionBanner(context);
    this.particles.draw(context);
    context.restore();
  }

  drawBackground(context) {
    const background = context.createRadialGradient(300, 290, 40, 300, 330, 430);
    background.addColorStop(0, "#213b49");
    background.addColorStop(0.7, "#122330");
    background.addColorStop(1, "#0b1721");
    context.fillStyle = background;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const startPoint = this.getPatternStartPoint();
    const endPoint = this.getPatternEndPoint();
    context.strokeStyle = hexToRgba(this.getPhaseAccentColor(), 0.18);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(startPoint.x, Math.max(0, startPoint.y - 66));
    context.lineTo(endPoint.x, Math.min(this.canvas.height, endPoint.y + 40));
    context.stroke();
  }

  drawBossSignature(context) {
    const motif = this.currentBoss.visualMotif;
    if (!motif) return;

    const phaseIndex = this.isEditorMode ? this.selectedPhaseIndex : this.currentPhaseIndex;
    const intensity = 0.11 + phaseIndex * 0.035;
    const accent = this.getPhaseAccentColor();
    const centerX = this.canvas.width / 2;
    const centerY = 315;
    context.save();
    context.strokeStyle = hexToRgba(accent, intensity);
    context.fillStyle = hexToRgba(accent, intensity * 0.48);
    context.lineWidth = 1.5;

    switch (motif.type) {
      case "ember-seal": {
        context.setLineDash([5, 7]);
        [78, 122].forEach(function (radius) {
          context.beginPath();
          context.arc(centerX, centerY, radius + phaseIndex * 5, 0, Math.PI * 2);
          context.stroke();
        });
        context.setLineDash([]);
        for (let index = 0; index < 6; index += 1) {
          const angle = -Math.PI / 2 + index * Math.PI / 3;
          context.beginPath();
          context.moveTo(centerX + Math.cos(angle) * 58, centerY + Math.sin(angle) * 58);
          context.lineTo(centerX + Math.cos(angle) * 104, centerY + Math.sin(angle) * 104);
          context.stroke();
        }
        break;
      }
      case "feather-whorl": {
        [-1, 0, 1].forEach(function (offset) {
          const startY = 244 + offset * 54;
          context.beginPath();
          context.moveTo(78, startY);
          context.quadraticCurveTo(250, startY - 108, 462, startY + 8);
          context.quadraticCurveTo(348, startY + 68, 216, startY + 28);
          context.stroke();
        });
        break;
      }
      case "bell-ripple": {
        [58, 104, 150].forEach(function (radius) {
          context.beginPath();
          context.arc(centerX, 270, radius + phaseIndex * 4, Math.PI * 0.14, Math.PI * 0.86);
          context.stroke();
        });
        context.beginPath();
        context.moveTo(centerX, 150);
        context.lineTo(centerX, 388);
        context.stroke();
        break;
      }
      case "string-volley": {
        context.setLineDash([4, 5]);
        [112, 206, 394, 488].forEach(function (startX) {
          context.beginPath();
          context.moveTo(startX, 148);
          context.lineTo(centerX, 392);
          context.stroke();
        });
        context.setLineDash([]);
        break;
      }
      case "silk-weave": {
        [-1, 0, 1].forEach(function (offset) {
          context.beginPath();
          context.moveTo(78, 220 + offset * 54);
          context.bezierCurveTo(170, 96 + offset * 34, 438, 450 - offset * 20, 522, 264 + offset * 48);
          context.stroke();
        });
        break;
      }
      case "brush-score": {
        context.lineWidth = 10;
        context.globalAlpha = 0.34;
        [0, 1, 2].forEach(function (index) {
          context.beginPath();
          context.moveTo(116, 185 + index * 88);
          context.bezierCurveTo(260, 150 + index * 88, 350, 400 - index * 42, 476, 372 - index * 38);
          context.stroke();
        });
        break;
      }
      case "mirror-tide": {
        context.beginPath();
        context.moveTo(88, centerY);
        context.lineTo(512, centerY);
        context.stroke();
        [56, 108, 160].forEach(function (radius) {
          context.beginPath();
          context.ellipse(centerX, centerY, radius, Math.max(18, radius * 0.26), 0, 0, Math.PI * 2);
          context.stroke();
        });
        break;
      }
      case "stance-line": {
        context.beginPath();
        context.moveTo(74, 438);
        context.lineTo(526, 438);
        context.stroke();
        context.beginPath();
        context.moveTo(172, 390);
        context.lineTo(centerX, 286);
        context.lineTo(428, 390);
        context.stroke();
        break;
      }
      case "twin-ribbon": {
        context.beginPath();
        context.ellipse(232, centerY, 138, 72, -0.52, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.ellipse(368, centerY, 138, 72, 0.52, 0, Math.PI * 2);
        context.stroke();
        break;
      }
      case "clockwork-wheel": {
        const radius = 108 + phaseIndex * 5;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
        for (let index = 0; index < 12; index += 1) {
          const angle = index * Math.PI / 6;
          context.beginPath();
          context.moveTo(centerX + Math.cos(angle) * 34, centerY + Math.sin(angle) * 34);
          context.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
          context.stroke();
        }
        break;
      }
      case "thunder-fall": {
        [-92, 0, 92].forEach(function (offset) {
          context.beginPath();
          context.moveTo(centerX + offset, 154);
          context.lineTo(centerX + offset - 24, 236);
          context.lineTo(centerX + offset + 18, 236);
          context.lineTo(centerX + offset - 12, 352);
          context.stroke();
        });
        break;
      }
      case "neon-lattice": {
        context.setLineDash([4, 6]);
        for (let index = 0; index < 5; index += 1) {
          const x = 132 + index * 84;
          const y = 190 + index * 52;
          context.beginPath();
          context.moveTo(x, 150);
          context.lineTo(x, 448);
          context.moveTo(90, y);
          context.lineTo(510, y);
          context.stroke();
        }
        context.setLineDash([]);
        break;
      }
      case "afterimage-step": {
        context.setLineDash([14, 9]);
        for (let index = 0; index < 5; index += 1) {
          context.beginPath();
          context.moveTo(96 + index * 74, 232 + (index % 2) * 76);
          context.lineTo(166 + index * 74, 282 + (index % 2) * 76);
          context.stroke();
        }
        context.setLineDash([]);
        break;
      }
      default:
        break;
    }

    context.restore();
  }

  drawWireframe(context) {
    const phaseAccent = this.getPhaseAccentColor();
    this.currentPattern.segments.forEach(function (segment, index) {
      const isCurrentSegment = index === this.currentSegmentIndex && this.state === COMBAT_STATE.ATTACKING;
      const isSelectedSegment = this.isEditorMode && index === this.selectedSegmentIndex;

      context.save();
      context.beginPath();
      context.moveTo(segment.p0.x, segment.p0.y);
      context.bezierCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y, segment.p3.x, segment.p3.y);
      context.strokeStyle = isSelectedSegment ? phaseAccent : hexToRgba(phaseAccent, 0.34);
      context.lineWidth = isSelectedSegment ? 4 : (isCurrentSegment ? 3 : 2);
      context.setLineDash(isSelectedSegment ? [] : [6, 4]);
      context.stroke();
      context.setLineDash([]);

      context.strokeStyle = isSelectedSegment ? hexToRgba(phaseAccent, 0.58) : "rgba(176, 164, 148, 0.22)";
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
          context.fillStyle = isEndpoint ? "#ff8b5b" : phaseAccent;
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

      context.fillStyle = isSelectedSegment ? phaseAccent : hexToRgba(phaseAccent, 0.7);
      context.font = "10px Microsoft YaHei, sans-serif";
      context.fillText((this.isEditorMode ? "第 " + (index + 1) + " 段 · " : "") + segment.label + " · " + segment.durationMs + "ms", (segment.p0.x + segment.p3.x) / 2, (segment.p0.y + segment.p3.y) / 2 - 9);
      context.restore();
    }.bind(this));

  }

  drawPlayerBlade(context) {
    const path=this.playerBlade.path||this.getBladePath();
    const settings=this.playerBlade.path?this.playerBlade.settings:this.getBladeSettings();
    const reach=Math.min(path.length,settings.reach), end=PLAYER_BLADE.at(path,reach);
    context.save();
    context.strokeStyle="#79e8dc";context.lineWidth=4;
    context.beginPath();context.moveTo(PLAYER_POSITION.x,PLAYER_POSITION.y);
    for(const p of path.points){if(p.distance>=reach)break;context.lineTo(p.x,p.y);}
    context.lineTo(end.x,end.y);context.stroke();
    context.lineWidth=1.5;context.setLineDash([6,5]);
    context.beginPath();context.arc(PLAYER_POSITION.x,PLAYER_POSITION.y,settings.parryRadius,0,Math.PI*2);context.stroke();context.setLineDash([]);
    const pos=this.playerBlade.path?PLAYER_BLADE.at(path,this.playerBlade.distance):PLAYER_POSITION;
    const returning=this.playerBlade.state==="return";
    context.beginPath();context.arc(pos.x,pos.y,PLAYER_BLADE.radius-(returning?1:0),0,Math.PI*2);
    context.fillStyle=returning?"#100f0d":"#79e8dc";context.fill();
    if(returning){context.lineWidth=2;context.stroke();}
    if(this.isEditorMode){
      context.fillStyle="#79e8dc";context.fillRect(end.x-5,end.y-5,10,10);
      context.font="11px Microsoft YaHei";
      context.fillText("攻击范围 · "+Math.round(reach)+"px",Math.min(450,end.x+12),Math.max(16,end.y));
      context.fillText("弹反圈 · 拖动虚线边缘",Math.min(420,PLAYER_POSITION.x+12),PLAYER_POSITION.y-settings.parryRadius-8);
      context.fillText("点选我方刀锋调整速度",15,24);
      if(!path.points.some(p=>p.distance<=reach&&Math.hypot(p.x-PLAYER_POSITION.x,p.y-PLAYER_POSITION.y)>settings.parryRadius)){
        context.fillStyle="#ffc178";context.fillText("范围未到圈外：无法产生普通拼刀",15,42);
      }
    }
    context.restore();
  }

  drawCombatAnchors(context) {
    const startPoint = this.getPatternStartPoint();
    const strikeEndPoint = this.getPatternEndPoint();
    const playerHurtbox = this.getPlayerHurtbox();
    const playerPoint = playerHurtbox.center;
    const isSeparateStrikePoint = Math.hypot(strikeEndPoint.x - playerPoint.x, strikeEndPoint.y - playerPoint.y) > 12;

    context.save();
    context.fillStyle = this.getPhaseAccentColor();
    context.shadowColor = this.getPhaseAccentColor();
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

  drawCommitCue(context) {
    const remainingMs = this.totalDurationMs - this.elapsedMs;
    if (!this.isCommitCueActive(remainingMs)) return;

    const cueProgress = clamp((this.getCommitCueLeadMs() - remainingMs) / Math.max(1, this.getCommitCueLeadMs()), 0, 1);
    const radius = 18 + cueProgress * 16;
    context.save();
    context.strokeStyle = this.getPhaseAccentColor();
    context.lineWidth = 2.5;
    context.globalAlpha = 0.5 + cueProgress * 0.45;
    context.shadowColor = this.getPhaseAccentColor();
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(this.cursorPos.x, this.cursorPos.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = "#fff0cf";
    context.font = "bold 12px Microsoft YaHei, sans-serif";
    context.fillText("预读 · " + this.getCommitCueLabel(), 18, 34);
    context.restore();
  }

  drawPhaseTransitionBanner(context) {
    if (!this.isPhaseTransitioning) return;

    const phase = this.getCombatPhase();
    context.save();
    context.fillStyle = "rgba(8, 7, 6, 0.68)";
    context.fillRect(36, 264, this.canvas.width - 72, 116);
    context.strokeStyle = this.getPhaseAccentColor();
    context.lineWidth = 2;
    context.strokeRect(36, 264, this.canvas.width - 72, 116);
    context.fillStyle = this.getPhaseAccentColor();
    context.font = "bold 18px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.fillText("PHASE " + (this.currentPhaseIndex + 1) + " · " + phase.name, this.canvas.width / 2, 310);
    context.fillStyle = "#fff0cf";
    context.font = "12px Microsoft YaHei, sans-serif";
    context.fillText("新节拍已进入 · 先观察再出手", this.canvas.width / 2, 344);
    context.restore();
  }
}

window.addEventListener("DOMContentLoaded", function () {
  new GameEngine();
});
