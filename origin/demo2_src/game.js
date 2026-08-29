/**
 * 只狼：贝塞尔轨道弹刀模拟引擎 (Sekiro Deflection Engine)
 * Core Architecture: Multi-segment Bezier Curves + Segmented Easing Functions
 */

// --- 1. Sound Engine (Web Audio API Synthesizer) ---
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playDeflect() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Metallic High Clang Oscillator
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    gain1.gain.setValueAtTime(0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Resonant Ringing Oscillator
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2800, now);
    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.4);
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playDeathblow() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

const audioEngine = new AudioEngine();

// --- 2. Easing Library ---
const Easing = {
  linear: t => t,
  easeInCubic: t => t * t * t,
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  slowFastPause: t => {
    // Custom S-curve easing: slow start, rapid dash, brief pause
    if (t < 0.5) return 2 * t * t * t;
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
};

// --- 3. Bezier Math Math Utilities ---
function cubicBezier(p0, p1, p2, p3, t) {
  const cx = 3 * (p1.x - p0.x);
  const bx = 3 * (p2.x - p1.x) - cx;
  const ax = p3.x - p0.x - cx - bx;

  const cy = 3 * (p1.y - p0.y);
  const by = 3 * (p2.y - p1.y) - cy;
  const ay = p3.y - p0.y - cy - by;

  const x = ax * t * t * t + bx * t * t + cx * t + p0.x;
  const y = ay * t * t * t + by * t * t + cy * t + p0.y;
  return { x, y };
}

// --- 4. Attack Pattern Presets (多段贝塞尔轨道配置) ---
const EnemyPos = { x: 150, y: 150 };
const PlayerPos = { x: 750, y: 380 };

const AttackPresets = {
  delayed_heavy: {
    name: "蓄力延迟下劈 (2段: 慢速拉高 + 骤降劈砍)",
    parryWindowMs: 200,
    segments: [
      {
        p0: EnemyPos,
        p1: { x: 250, y: 50 },
        p2: { x: 450, y: 60 },
        p3: { x: 520, y: 120 },
        durationMs: 1200, // 蓄力阶段：1200ms
        easing: Easing.easeInCubic,
        label: "前摇蓄力"
      },
      {
        p0: { x: 520, y: 120 },
        p1: { x: 600, y: 180 },
        p2: { x: 680, y: 280 },
        p3: PlayerPos,
        durationMs: 350, // 劈砍阶段：350ms 极快
        easing: Easing.easeOutExpo,
        label: "暴击下劈"
      }
    ]
  },
  ashina_flurry: {
    name: "苇名三连斩 (3段: 弧形连续突袭)",
    parryWindowMs: 180,
    segments: [
      {
        p0: EnemyPos,
        p1: { x: 280, y: 280 },
        p2: { x: 380, y: 100 },
        p3: { x: 420, y: 220 },
        durationMs: 500,
        easing: Easing.easeInOutSine,
        label: "一之型"
      },
      {
        p0: { x: 420, y: 220 },
        p1: { x: 480, y: 380 },
        p2: { x: 580, y: 120 },
        p3: { x: 620, y: 260 },
        durationMs: 400,
        easing: Easing.easeInQuad,
        label: "二之型"
      },
      {
        p0: { x: 620, y: 260 },
        p1: { x: 650, y: 320 },
        p2: { x: 700, y: 360 },
        p3: PlayerPos,
        durationMs: 300,
        easing: Easing.easeOutExpo,
        label: "终结型"
      }
    ]
  },
  spiral_thrust: {
    name: "螺旋突刺 (2段: S形迷踪 + 疾速直刺)",
    parryWindowMs: 170,
    segments: [
      {
        p0: EnemyPos,
        p1: { x: 100, y: 350 },
        p2: { x: 450, y: 450 },
        p3: { x: 500, y: 250 },
        durationMs: 900,
        easing: Easing.slowFastPause,
        label: "S形迷踪前摇"
      },
      {
        p0: { x: 500, y: 250 },
        p1: { x: 580, y: 200 },
        p2: { x: 680, y: 320 },
        p3: PlayerPos,
        durationMs: 280,
        easing: Easing.easeOutExpo,
        label: "死角突刺"
      }
    ]
  },
  deceptive_pause: {
    name: "芦苇地伪装慢刀 (3段: 极慢 - 迟滞 - 暴击)",
    parryWindowMs: 190,
    segments: [
      {
        p0: EnemyPos,
        p1: { x: 300, y: 80 },
        p2: { x: 480, y: 90 },
        p3: { x: 550, y: 150 },
        durationMs: 1500,
        easing: Easing.linear,
        label: "超长慢刀前摇"
      },
      {
        p0: { x: 550, y: 150 },
        p1: { x: 580, y: 180 },
        p2: { x: 600, y: 200 },
        p3: { x: 620, y: 220 },
        durationMs: 400,
        easing: Easing.easeInCubic,
        label: "空中迟滞假动作"
      },
      {
        p0: { x: 620, y: 220 },
        p1: { x: 660, y: 280 },
        p2: { x: 710, y: 340 },
        p3: PlayerPos,
        durationMs: 250,
        easing: Easing.easeOutExpo,
        label: "变光迅捷下劈"
      }
    ]
  }
};

// --- 5. Particle Engine (Spark & Trail Effects) ---
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawnSparks(x, y, count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.3 ? '#f59e0b' : '#ffffff'
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- 6. Main Game Engine Class ---
class DeflectionGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Game States
    this.enemyHp = 100;
    this.playerHp = 100;
    this.enemyPosture = 0; // 0 to 100

    this.currentPatternKey = "delayed_heavy";
    this.pattern = AttackPresets[this.currentPatternKey];

    this.isAttacking = false;
    this.isDeflected = false;
    this.isDeathblowReady = false;

    this.startTime = 0;
    this.elapsedTime = 0;
    this.totalDurationMs = 0;

    this.cursorPos = { ...EnemyPos };
    this.cursorTrail = [];

    this.particles = new ParticleSystem();
    this.screenShakeTime = 0;

    // Options
    this.showWireframe = true;
    this.autoLoop = false;

    this.initDOM();
    this.bindEvents();
    this.resetCombat();

    requestAnimationFrame(timestamp => this.gameLoop(timestamp));
  }

  initDOM() {
    this.enemyHpBar = document.getElementById("enemy-hp-bar");
    this.enemyHpText = document.getElementById("enemy-hp-text");
    this.playerHpBar = document.getElementById("player-hp-bar");
    this.playerHpText = document.getElementById("player-hp-text");
    this.postureBar = document.getElementById("posture-bar");
    this.postureText = document.getElementById("posture-text");
    this.deathblowOverlay = document.getElementById("deathblowOverlay");
    this.timingFeedback = document.getElementById("timingFeedback");
    this.playerStatus = document.getElementById("player-status");
  }

  bindEvents() {
    document.getElementById("patternSelect").addEventListener("change", (e) => {
      this.currentPatternKey = e.target.value;
      this.pattern = AttackPresets[this.currentPatternKey];
      if (!this.isAttacking) this.resetCombat();
    });

    document.getElementById("attackBtn").addEventListener("click", () => this.startAttack());
    document.getElementById("parryBtn").addEventListener("click", () => this.triggerParry());
    document.getElementById("resetBtn").addEventListener("click", () => this.resetCombat());

    document.getElementById("showWireframe").addEventListener("change", (e) => {
      this.showWireframe = e.target.checked;
    });

    document.getElementById("autoLoop").addEventListener("change", (e) => {
      this.autoLoop = e.target.checked;
    });

    document.getElementById("soundToggle").addEventListener("change", (e) => {
      audioEngine.enabled = e.target.checked;
    });

    // Keyboard Hotkeys
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.triggerParry();
      } else if (e.code === "Enter") {
        e.preventDefault();
        this.startAttack();
      }
    });

    // Canvas Click to Parry
    this.canvas.addEventListener("mousedown", () => this.triggerParry());
  }

  calculateTotalDuration() {
    return this.pattern.segments.reduce((acc, seg) => acc + seg.durationMs, 0);
  }

  startAttack() {
    if (this.isDeathblowReady) {
      this.executeDeathblow();
      return;
    }
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.isDeflected = false;
    this.startTime = performance.now();
    this.totalDurationMs = this.calculateTotalDuration();
    this.cursorTrail = [];
    this.playerStatus.innerText = "敌方剑锋靠近中...";
    this.playerStatus.style.color = "#f59e0b";
  }

  triggerParry() {
    if (this.isDeathblowReady) {
      this.executeDeathblow();
      return;
    }

    if (!this.isAttacking || this.isDeflected) return;

    const remainingTime = this.totalDurationMs - this.elapsedTime;
    const isWindowActive = remainingTime <= this.pattern.parryWindowMs && remainingTime >= -30;

    if (isWindowActive) {
      // 完美弹反成功！
      this.isDeflected = true;
      this.isAttacking = false;
      audioEngine.playDeflect();

      // 特效与反馈
      this.particles.spawnSparks(this.cursorPos.x, this.cursorPos.y, 40);
      this.screenShakeTime = 15;
      this.showFeedback("PERFECT PARRY! (完美弹反)", "#f59e0b");

      // 累加敌人架势值
      this.enemyPosture = Math.min(100, this.enemyPosture + 25);
      this.enemyHp = Math.max(0, this.enemyHp - 5);
      this.updateUI();

      if (this.enemyPosture >= 100) {
        this.triggerDeathblowState();
      } else {
        this.playerStatus.innerText = "弹反成功！架势提升！";
        this.playerStatus.style.color = "#34d399";
        if (this.autoLoop) setTimeout(() => this.startAttack(), 1000);
      }
    } else {
      // 提前/滞后按键惩罚
      this.showFeedback("PARRY MISSTIMED! (按键过早)", "#ef4444");
    }
  }

  triggerDeathblowState() {
    this.isDeathblowReady = true;
    this.deathblowOverlay.classList.add("active");
    audioEngine.playDeathblow();
    this.playerStatus.innerText = "敌人架势已崩溃！按下 [Space] 忍杀处决！";
    this.playerStatus.style.color = "#ef4444";
  }

  executeDeathblow() {
    if (!this.isDeathblowReady) return;
    this.isDeathblowReady = false;
    this.enemyHp = 0;
    this.enemyPosture = 100;
    this.deathblowOverlay.classList.remove("active");
    this.particles.spawnSparks(EnemyPos.x, EnemyPos.y, 80);
    audioEngine.playDeathblow();
    this.showFeedback("忍殺 SUCCESSFUL!", "#dc2626");
    this.updateUI();
    this.playerStatus.innerText = "大胜！战斗结束！";
    this.playerStatus.style.color = "#34d399";
  }

  onHitPlayer() {
    this.isAttacking = false;
    audioEngine.playHit();
    this.particles.spawnSparks(PlayerPos.x, PlayerPos.y, 25);
    this.screenShakeTime = 20;

    this.playerHp = Math.max(0, this.playerHp - 30);
    this.enemyPosture = 0; // 受击清空敌方架势条
    this.showFeedback("HIT! (玩家受击)", "#ef4444");
    this.updateUI();

    this.playerStatus.innerText = "受击！架势条重置！";
    this.playerStatus.style.color = "#f87171";

    if (this.playerHp <= 0) {
      this.playerStatus.innerText = "死 (YOU DIED)";
    } else if (this.autoLoop) {
      setTimeout(() => this.startAttack(), 1200);
    }
  }

  resetCombat() {
    this.enemyHp = 100;
    this.playerHp = 100;
    this.enemyPosture = 0;
    this.isAttacking = false;
    this.isDeflected = false;
    this.isDeathblowReady = false;
    this.cursorPos = { ...EnemyPos };
    this.cursorTrail = [];
    this.deathblowOverlay.classList.remove("active");
    this.updateUI();
    this.playerStatus.innerText = "准备就绪";
    this.playerStatus.style.color = "#94a3b8";
  }

  updateUI() {
    this.enemyHpBar.style.width = `${this.enemyHp}%`;
    this.enemyHpText.innerText = `HP: ${this.enemyHp}/100`;
    this.playerHpBar.style.width = `${this.playerHp}%`;
    this.playerHpText.innerText = `HP: ${this.playerHp}/100`;
    this.postureBar.style.width = `${this.enemyPosture}%`;
    this.postureText.innerText = `${this.enemyPosture}%`;
  }

  showFeedback(text, color) {
    this.timingFeedback.innerText = text;
    this.timingFeedback.style.color = color;
    this.timingFeedback.classList.add("show");
    setTimeout(() => {
      this.timingFeedback.classList.remove("show");
    }, 800);
  }

  // --- Multi-Segment Trajectory Calculation ---
  evaluateTrajectory(elapsedMs) {
    let accumulatedMs = 0;
    for (let i = 0; i < this.pattern.segments.length; i++) {
      const seg = this.pattern.segments[i];
      if (elapsedMs <= accumulatedMs + seg.durationMs || i === this.pattern.segments.length - 1) {
        const segElapsed = Math.max(0, elapsedMs - accumulatedMs);
        const tRaw = Math.min(1, segElapsed / seg.durationMs);
        const tEased = seg.easing(tRaw);
        return cubicBezier(seg.p0, seg.p1, seg.p2, seg.p3, tEased);
      }
      accumulatedMs += seg.durationMs;
    }
    return PlayerPos;
  }

  gameLoop(timestamp) {
    // 1. Update Game Logic
    if (this.isAttacking) {
      this.elapsedTime = timestamp - this.startTime;

      if (this.elapsedTime >= this.totalDurationMs) {
        this.cursorPos = { ...PlayerPos };
        this.onHitPlayer();
      } else {
        this.cursorPos = this.evaluateTrajectory(this.elapsedTime);
        this.cursorTrail.push({ ...this.cursorPos, alpha: 1.0 });
        if (this.cursorTrail.length > 20) this.cursorTrail.shift();
      }
    }

    // Update Particles & Screen Shake
    this.particles.update();
    if (this.screenShakeTime > 0) this.screenShakeTime--;

    // 2. Render Canvas
    this.render();

    requestAnimationFrame(ts => this.gameLoop(ts));
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake Offset
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * 12;
      const shakeY = (Math.random() - 0.5) * 12;
      ctx.translate(shakeX, shakeY);
    }

    // Clear Background
    ctx.fillStyle = "#0a0b0d";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }

    // Draw Wireframe Bezier Segments
    if (this.showWireframe) {
      this.pattern.segments.forEach((seg, idx) => {
        // Curve Line
        ctx.beginPath();
        ctx.moveTo(seg.p0.x, seg.p0.y);
        ctx.bezierCurveTo(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y, seg.p3.x, seg.p3.y);
        ctx.strokeStyle = idx === this.pattern.segments.length - 1 ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.3)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Control Points Anchor Lines
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(seg.p0.x, seg.p0.y); ctx.lineTo(seg.p1.x, seg.p1.y);
        ctx.moveTo(seg.p3.x, seg.p3.y); ctx.lineTo(seg.p2.x, seg.p2.y);
        ctx.stroke();

        // Control Point Handles
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath(); ctx.arc(seg.p1.x, seg.p1.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(seg.p2.x, seg.p2.y, 4, 0, Math.PI * 2); ctx.fill();

        // Segment Label Text
        ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
        ctx.font = "12px sans-serif";
        ctx.fillText(`${seg.label} (${seg.durationMs}ms)`, (seg.p0.x + seg.p3.x) / 2, (seg.p0.y + seg.p3.y) / 2 - 10);
      });
    }

    // Draw Enemy Base Node
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(EnemyPos.x, EnemyPos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("敌方剑圣", EnemyPos.x - 24, EnemyPos.y - 20);

    // Draw Player Stance Ring (Parry Target Zone)
    const remainingMs = this.totalDurationMs - this.elapsedTime;
    const isParryZoneActive = this.isAttacking && remainingMs <= this.pattern.parryWindowMs;

    ctx.strokeStyle = isParryZoneActive ? "#f59e0b" : "#10b981";
    ctx.lineWidth = isParryZoneActive ? 4 : 2;
    ctx.shadowColor = isParryZoneActive ? "#f59e0b" : "#10b981";
    ctx.shadowBlur = isParryZoneActive ? 20 : 8;
    ctx.beginPath();
    ctx.arc(PlayerPos.x, PlayerPos.y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(PlayerPos.x, PlayerPos.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillText("玩家 (狼)", PlayerPos.x - 24, PlayerPos.y + 45);

    // Draw Cursor Motion Trail
    ctx.lineWidth = 2;
    for (let i = 0; i < this.cursorTrail.length - 1; i++) {
      const p1 = this.cursorTrail[i];
      const p2 = this.cursorTrail[i + 1];
      const alpha = (i / this.cursorTrail.length);
      ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw Sword-Tip Cursor (剑锋光标)
    if (this.isAttacking) {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(this.cursorPos.x, this.cursorPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Particles
    this.particles.draw(ctx);

    ctx.restore();
  }
}

// Start Game Engine on DOM Load
window.addEventListener("DOMContentLoaded", () => {
  new DeflectionGame();
});
