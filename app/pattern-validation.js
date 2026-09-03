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

  return Object.freeze({
    CONSTRAINTS: CONSTRAINTS,
    DEFAULTS: DEFAULTS,
    EASING_NAMES: EASING_NAMES,
    validateAttackPattern: validateAttackPattern,
    validatePatternLibrary: validatePatternLibrary
  });
}));
