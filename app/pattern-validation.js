(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BladeTracePatternValidation = api;
}(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const EASING_NAMES = Object.freeze([
    "linear",
    "easeInQuad",
    "easeInCubic",
    "easeOutCubic",
    "easeInExpo",
    "easeOutExpo",
    "easeInOutSine",
    "slowFastPause"
  ]);

  const CONSTRAINTS = Object.freeze({
    minSegmentDurationMs: 50,
    minPlayerHurtboxRadius: 12,
    maxPlayerHurtboxRadius: 160,
    minParryWindowMs: 30,
    maxParryWindowMs: 1000,
    minBossPhases: 2,
    maxBossPhases: 5,
    maxPhasePostureThreshold: 99,
    minPointX: 0,
    maxPointX: 600,
    minPointY: 0,
    maxPointY: 650
  });

  const DEFAULTS = Object.freeze({
    playerHurtboxRadius: 25,
    parryWindowMs: 150,
    playerPosition: Object.freeze({ x: 300, y: 570 })
  });

  function addIssue(collection, code, path, message) {
    collection.push({ code: code, path: path, message: message });
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isFinitePoint(point) {
    return Boolean(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isHexColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function pointsMatch(first, second) {
    return Math.abs(first.x - second.x) <= 0.001 && Math.abs(first.y - second.y) <= 0.001;
  }

  function validatePoint(point, path, errors) {
    if (!isFinitePoint(point)) {
      addIssue(errors, "INVALID_POINT", path, path + " 必须是有限的 x/y 坐标。");
      return false;
    }

    if (point.x < CONSTRAINTS.minPointX || point.x > CONSTRAINTS.maxPointX || point.y < CONSTRAINTS.minPointY || point.y > CONSTRAINTS.maxPointY) {
      addIssue(errors, "POINT_OUT_OF_BOUNDS", path, path + " 必须位于画布边界内。");
      return false;
    }

    return true;
  }

  function getTerminalImpact(pattern, playerPosition) {
    const segments = Array.isArray(pattern && pattern.segments) ? pattern.segments : [];
    const terminalSegment = segments[segments.length - 1];
    const terminalPoint = terminalSegment && terminalSegment.p3;
    const radius = pattern && pattern.playerHurtboxRadius;

    if (!isFinitePoint(terminalPoint) || !isFinitePoint(playerPosition) || !isFiniteNumber(radius)) {
      return { known: false, hitsPlayerHurtbox: false, distance: null, radius: radius || null };
    }

    const distance = Math.hypot(terminalPoint.x - playerPosition.x, terminalPoint.y - playerPosition.y);
    return {
      known: true,
      hitsPlayerHurtbox: distance <= radius,
      distance: distance,
      radius: radius
    };
  }

  function validateAttackPattern(pattern, options) {
    const settings = options || {};
    const playerPosition = settings.playerPosition || DEFAULTS.playerPosition;
    const supportedEasings = settings.supportedEasings || EASING_NAMES;
    const errors = [];
    const warnings = [];

    if (!pattern || typeof pattern !== "object") {
      addIssue(errors, "INVALID_PATTERN", "pattern", "招式必须是对象。");
      return {
        isValid: false,
        errors: errors,
        warnings: warnings,
        totalDurationMs: 0,
        terminalImpact: { known: false, hitsPlayerHurtbox: false, distance: null, radius: null }
      };
    }

    if (!isNonEmptyString(pattern.name)) addIssue(errors, "MISSING_PATTERN_NAME", "name", "招式需要名称。");
    if (!isNonEmptyString(pattern.description)) addIssue(errors, "MISSING_PATTERN_DESCRIPTION", "description", "招式需要面向练习者的简短说明。");
    if (pattern.kind !== "NORMAL") addIssue(errors, "UNSUPPORTED_ATTACK_KIND", "kind", "当前版本只支持 NORMAL 普通攻击。");

    if (!Number.isInteger(pattern.damage) || pattern.damage < 1 || pattern.damage > 100) {
      addIssue(errors, "PLAYER_DAMAGE_OUT_OF_RANGE", "damage", "玩家伤害必须是 1 到 100 的整数。");
    }

    if (!Number.isInteger(pattern.postureGain) || pattern.postureGain < 1 || pattern.postureGain > 100) {
      addIssue(errors, "POSTURE_GAIN_OUT_OF_RANGE", "postureGain", "敌方架势收益必须是 1 到 100 的整数。");
    }

    if (!Number.isInteger(pattern.playerHurtboxRadius) || pattern.playerHurtboxRadius < CONSTRAINTS.minPlayerHurtboxRadius || pattern.playerHurtboxRadius > CONSTRAINTS.maxPlayerHurtboxRadius) {
      addIssue(errors, "PLAYER_HURTBOX_RADIUS_OUT_OF_RANGE", "playerHurtboxRadius", "玩家受击区半径必须在 " + CONSTRAINTS.minPlayerHurtboxRadius + " 到 " + CONSTRAINTS.maxPlayerHurtboxRadius + "px 之间。");
    }

    if (!Number.isInteger(pattern.parryWindowMs) || pattern.parryWindowMs < CONSTRAINTS.minParryWindowMs || pattern.parryWindowMs > CONSTRAINTS.maxParryWindowMs) {
      addIssue(errors, "PARRY_WINDOW_OUT_OF_RANGE", "parryWindowMs", "弹反判定窗必须在 " + CONSTRAINTS.minParryWindowMs + " 到 " + CONSTRAINTS.maxParryWindowMs + "ms 之间。");
    }

    if (!Array.isArray(pattern.segments) || pattern.segments.length === 0) {
      addIssue(errors, "MISSING_SEGMENTS", "segments", "招式至少需要一个贝塞尔段。");
    }

    let totalDurationMs = 0;
    let previousEndPoint = null;
    if (Array.isArray(pattern.segments)) {
      pattern.segments.forEach(function (segment, index) {
        const path = "segments[" + index + "]";
        if (!segment || typeof segment !== "object") {
          addIssue(errors, "INVALID_SEGMENT", path, path + " 必须是对象。");
          previousEndPoint = null;
          return;
        }

        if (!isNonEmptyString(segment.label)) addIssue(errors, "MISSING_SEGMENT_LABEL", path + ".label", path + " 需要标签。");
        if (!Number.isInteger(segment.durationMs) || segment.durationMs < CONSTRAINTS.minSegmentDurationMs) {
          addIssue(errors, "SEGMENT_DURATION_OUT_OF_RANGE", path + ".durationMs", path + " 的时长至少为 " + CONSTRAINTS.minSegmentDurationMs + "ms。");
        } else {
          totalDurationMs += segment.durationMs;
        }

        if (!supportedEasings.includes(segment.easing)) {
          addIssue(errors, "UNKNOWN_EASING", path + ".easing", path + " 使用了未注册的缓动函数。");
        }

        const startIsValid = validatePoint(segment.p0, path + ".p0", errors);
        validatePoint(segment.p1, path + ".p1", errors);
        validatePoint(segment.p2, path + ".p2", errors);
        const endIsValid = validatePoint(segment.p3, path + ".p3", errors);

        if (previousEndPoint && startIsValid && !pointsMatch(previousEndPoint, segment.p0)) {
          addIssue(errors, "SEGMENT_ENDPOINT_DISCONTINUITY", path + ".p0", "相邻段必须共享前一段的 P3 与当前段的 P0。");
        }
        previousEndPoint = endIsValid ? segment.p3 : null;
      });
    }

    if (Number.isInteger(pattern.parryWindowMs) && totalDurationMs > 0 && pattern.parryWindowMs > totalDurationMs) {
      addIssue(errors, "PARRY_WINDOW_EXCEEDS_TOTAL_DURATION", "parryWindowMs", "弹反判定窗不能长于整招时长。");
    }

    const terminalImpact = getTerminalImpact(pattern, playerPosition);
    if (terminalImpact.known && !terminalImpact.hitsPlayerHurtbox) {
      addIssue(warnings, "TERMINAL_ENDPOINT_MISSES_PLAYER_HURTBOX", "segments[" + (pattern.segments.length - 1) + "].p3", "攻击终点位于玩家受击区外；运行时会结算为攻击落空。");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      totalDurationMs: totalDurationMs,
      terminalImpact: terminalImpact
    };
  }

  function validatePatternLibrary(patterns, options) {
    const errors = [];
    const results = {};
    if (!patterns || typeof patterns !== "object" || Array.isArray(patterns)) {
      addIssue(errors, "INVALID_PATTERN_LIBRARY", "patterns", "招式库必须是以 ID 为键的对象。");
      return { isValid: false, errors: errors, results: results };
    }

    const entries = Object.entries(patterns);
    if (entries.length === 0) addIssue(errors, "EMPTY_PATTERN_LIBRARY", "patterns", "招式库至少需要一招。");

    entries.forEach(function (entry) {
      const key = entry[0];
      const result = validateAttackPattern(entry[1], options);
      results[key] = result;
      result.errors.forEach(function (error) {
        errors.push({
          code: error.code,
          path: key + "." + error.path,
          message: "[" + key + "] " + error.message
        });
      });
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
      results: results
    };
  }

  function validateBoss(boss, patterns) {
    const errors = [];
    if (!boss || typeof boss !== "object") {
      addIssue(errors, "INVALID_BOSS", "boss", "Boss 必须是对象。");
      return { isValid: false, errors: errors };
    }

    if (!isNonEmptyString(boss.name)) addIssue(errors, "MISSING_BOSS_NAME", "name", "Boss 需要名称。");
    if (!isNonEmptyString(boss.description)) addIssue(errors, "MISSING_BOSS_DESCRIPTION", "description", "Boss 需要人格说明。");

    if (!Array.isArray(boss.phases) || boss.phases.length < CONSTRAINTS.minBossPhases) {
      addIssue(errors, "TOO_FEW_BOSS_PHASES", "phases", "Boss 至少需要 " + CONSTRAINTS.minBossPhases + " 个阶段。");
      return { isValid: false, errors: errors };
    }
    if (boss.phases.length > CONSTRAINTS.maxBossPhases) {
      addIssue(errors, "TOO_MANY_BOSS_PHASES", "phases", "Boss 最多支持 " + CONSTRAINTS.maxBossPhases + " 个阶段。");
    }

    const phaseIds = new Set();
    let previousThreshold = null;
    boss.phases.forEach(function (phase, index) {
      const path = "phases[" + index + "]";
      if (!phase || typeof phase !== "object") {
        addIssue(errors, "INVALID_BOSS_PHASE", path, path + " 必须是对象。");
        previousThreshold = null;
        return;
      }

      if (!isNonEmptyString(phase.id)) {
        addIssue(errors, "MISSING_PHASE_ID", path + ".id", path + " 需要稳定 ID。");
      } else if (phaseIds.has(phase.id)) {
        addIssue(errors, "DUPLICATE_PHASE_ID", path + ".id", "同一 Boss 内的阶段 ID 不能重复。");
      } else {
        phaseIds.add(phase.id);
      }

      if (!isNonEmptyString(phase.name)) addIssue(errors, "MISSING_PHASE_NAME", path + ".name", path + " 需要名称。");
      if (!isNonEmptyString(phase.description)) addIssue(errors, "MISSING_PHASE_DESCRIPTION", path + ".description", path + " 需要练习提示。");
      if (!isHexColor(phase.accentColor)) addIssue(errors, "INVALID_PHASE_ACCENT", path + ".accentColor", path + " 需要 6 位十六进制强调色。");

      const threshold = phase.postureThreshold;
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > CONSTRAINTS.maxPhasePostureThreshold) {
        addIssue(errors, "PHASE_THRESHOLD_OUT_OF_RANGE", path + ".postureThreshold", path + " 的架势阈值必须是 0 到 " + CONSTRAINTS.maxPhasePostureThreshold + " 的整数。");
      } else {
        if (index === 0 && threshold !== 0) {
          addIssue(errors, "FIRST_PHASE_THRESHOLD_MUST_BE_ZERO", path + ".postureThreshold", "首阶段的架势阈值必须为 0。");
        }
        if (index > 0 && previousThreshold !== null && threshold <= previousThreshold) {
          addIssue(errors, "PHASE_THRESHOLD_NOT_STRICTLY_INCREASING", path + ".postureThreshold", "后续阶段的架势阈值必须严格递增。");
        }
        previousThreshold = threshold;
      }

      if (!Array.isArray(phase.patternIds) || phase.patternIds.length === 0) {
        addIssue(errors, "EMPTY_PHASE_PATTERN_POOL", path + ".patternIds", path + " 至少需要一招。");
        return;
      }

      const patternIds = new Set();
      phase.patternIds.forEach(function (patternId, patternIndex) {
        const patternPath = path + ".patternIds[" + patternIndex + "]";
        if (!isNonEmptyString(patternId) || !patterns || !Object.hasOwn(patterns, patternId)) {
          addIssue(errors, "UNKNOWN_PHASE_PATTERN", patternPath, path + " 引用了不存在的招式 ID。");
          return;
        }
        if (patternIds.has(patternId)) {
          addIssue(errors, "DUPLICATE_PHASE_PATTERN", patternPath, path + " 的招式池不能重复同一招。");
          return;
        }
        patternIds.add(patternId);
      });
    });

    return { isValid: errors.length === 0, errors: errors };
  }

  function validateBossLibrary(bosses, patterns) {
    const errors = [];
    const results = {};
    if (!bosses || typeof bosses !== "object" || Array.isArray(bosses)) {
      addIssue(errors, "INVALID_BOSS_LIBRARY", "bosses", "Boss 库必须是以 ID 为键的对象。");
      return { isValid: false, errors: errors, results: results };
    }

    const entries = Object.entries(bosses);
    if (entries.length === 0) addIssue(errors, "EMPTY_BOSS_LIBRARY", "bosses", "Boss 库至少需要一个 Boss。");

    entries.forEach(function (entry) {
      const key = entry[0];
      const result = validateBoss(entry[1], patterns);
      results[key] = result;
      result.errors.forEach(function (error) {
        errors.push({
          code: error.code,
          path: key + "." + error.path,
          message: "[" + key + "] " + error.message
        });
      });
    });

    return { isValid: errors.length === 0, errors: errors, results: results };
  }

  function resolveBossPhase(boss, posture) {
    const phases = Array.isArray(boss && boss.phases) ? boss.phases : [];
    if (phases.length === 0) return { phase: null, phaseIndex: -1 };

    const postureValue = Number.isFinite(Number(posture)) ? Number(posture) : 0;
    let phaseIndex = 0;
    phases.forEach(function (phase, index) {
      if (phase && Number.isInteger(phase.postureThreshold) && postureValue >= phase.postureThreshold) {
        phaseIndex = index;
      }
    });
    return { phase: phases[phaseIndex], phaseIndex: phaseIndex };
  }

  return Object.freeze({
    CONSTRAINTS: CONSTRAINTS,
    DEFAULTS: DEFAULTS,
    EASING_NAMES: EASING_NAMES,
    validateAttackPattern: validateAttackPattern,
    validatePatternLibrary: validatePatternLibrary,
    validateBossLibrary: validateBossLibrary,
    resolveBossPhase: resolveBossPhase
  });
}));
