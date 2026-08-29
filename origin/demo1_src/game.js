/**
 * 《斩迹 (BladeTrace)》 核心逻辑实现
 */

// --- 1. 音效合成器 (Web Audio API) ---
class AudioSynthesizer {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playClang() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playHit() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playDeathblow() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.8);

        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
    }
}

// --- 2. 缓动函数库 (Easing Functions) ---
const Easings = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
};

// --- 3. 三阶贝塞尔曲线算法 ---
function getBezierPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
}

// --- 4. 预设攻击招式配置 (Attack Patterns) ---
const ATTACK_PATTERNS = {
    delayed: {
        id: "delayed",
        name: "苇名流·延迟斩",
        segments: [
            {
                // 第一段：极慢蓄力前摇
                p0: { x: 300, y: 100 }, p1: { x: 120, y: 150 }, p2: { x: 80, y: 300 }, p3: { x: 150, y: 380 },
                duration: 900, easing: "easeOutCubic"
            },
            {
                // 第二段：快速斩击落刀
                p0: { x: 150, y: 380 }, p1: { x: 200, y: 440 }, p2: { x: 280, y: 520 }, p3: { x: 300, y: 570 },
                duration: 220, easing: "easeInExpo"
            }
        ]
    },
    triple: {
        id: "triple",
        name: "三连斩·快速变奏",
        segments: [
            { p0: { x: 300, y: 100 }, p1: { x: 450, y: 180 }, p2: { x: 400, y: 350 }, p3: { x: 260, y: 420 }, duration: 500, easing: "easeOutCubic" },
            { p0: { x: 260, y: 420 }, p1: { x: 100, y: 300 }, p2: { x: 150, y: 480 }, p3: { x: 280, y: 520 }, duration: 400, easing: "easeInOutSine" },
            { p0: { x: 280, y: 520 }, p1: { x: 350, y: 450 }, p2: { x: 320, y: 540 }, p3: { x: 300, y: 570 }, duration: 180, easing: "easeInExpo" }
        ]
    },
    overhead: {
        id: "overhead",
        name: "跳劈·极速下斩",
        segments: [
            { p0: { x: 300, y: 100 }, p1: { x: 300, y: 40 }, p2: { x: 200, y: 60 }, p3: { x: 200, y: 200 }, duration: 750, easing: "easeOutCubic" },
            { p0: { x: 200, y: 200 }, p1: { x: 200, y: 350 }, p2: { x: 290, y: 480 }, p3: { x: 300, y: 570 }, duration: 160, easing: "easeInExpo" }
        ]
    }
};

// --- 5. 游戏引擎主逻辑 ---
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioSynthesizer();

        // 基础数值
        this.playerHP = 100;
        this.enemyPosture = 0;
        this.parryWindowMs = 150;
        
        // 运行状态
        this.state = 'IDLE'; // IDLE, ATTACKING, PARRY_ANIM, DEATHBLOW
        this.currentPattern = ATTACK_PATTERNS.delayed;
        this.currentSegmentIndex = 0;
        this.segmentStartTime = 0;
        
        this.cursorPos = { x: 300, y: 100 };
        this.particles = [];
        this.screenShake = 0;
        this.bounceVector = null;

        this.initDOM();
        this.bindEvents();
        requestAnimationFrame(this.loop.bind(this));
    }

    initDOM() {
        this.enemyPostureBar = document.getElementById('enemy-posture-bar');
        this.playerHpBar = document.getElementById('player-hp-bar');
        this.deathblowOverlay = document.getElementById('deathblow-overlay');
        this.patternSelect = document.getElementById('pattern-select');
        this.windowSelect = document.getElementById('window-select');
    }

    bindEvents() {
        document.getElementById('btn-attack').addEventListener('click', () => this.startAttack());
        document.getElementById('btn-parry').addEventListener('click', () => this.handleParryInput());
        this.deathblowOverlay.addEventListener('click', () => this.executeDeathblow());

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === 'DEATHBLOW') {
                    this.executeDeathblow();
                } else if (this.state === 'ATTACKING') {
                    this.handleParryInput();
                } else if (this.state === 'IDLE') {
                    this.startAttack();
                }
            }
        });

        this.patternSelect.addEventListener('change', (e) => {
            this.currentPattern = ATTACK_PATTERNS[e.target.value];
        });

        this.windowSelect.addEventListener('change', (e) => {
            this.parryWindowMs = parseInt(e.target.value);
        });
    }

    startAttack() {
        if (this.state !== 'IDLE') return;
        this.state = 'ATTACKING';
        this.currentSegmentIndex = 0;
        this.segmentStartTime = performance.now();
    }

    handleParryInput() {
        if (this.state !== 'ATTACKING') return;

        const now = performance.now();
        const pattern = this.currentPattern;
        const totalSegments = pattern.segments.length;
        
        // 判定是否在最后一段落的判定窗口内
        if (this.currentSegmentIndex === totalSegments - 1) {
            const currentSeg = pattern.segments[this.currentSegmentIndex];
            const elapsed = now - this.segmentStartTime;
            const remainingMs = currentSeg.duration - elapsed;

            if (remainingMs >= 0 && remainingMs <= this.parryWindowMs) {
                // 成功弹反！
                this.triggerParrySuccess();
                return;
            }
        }

        // 提前过早按或错误时机按
        this.screenShake = 5;
    }

    triggerParrySuccess() {
        this.state = 'PARRY_ANIM';
        this.audio.playClang();
        this.spawnSparks(this.cursorPos.x, this.cursorPos.y);

        // 增加敌方架势值
        this.enemyPosture = Math.min(100, this.enemyPosture + 34);
        this.updateHUD();

        // 计算向敌方弹射动画
        this.bounceVector = {
            startX: this.cursorPos.x,
            startY: this.cursorPos.y,
            endX: 300,
            endY: 100,
            startTime: performance.now(),
            duration: 250
        };

        if (this.enemyPosture >= 100) {
            setTimeout(() => {
                this.state = 'DEATHBLOW';
                this.audio.playDeathblow();
                this.deathblowOverlay.classList.remove('hidden');
            }, 300);
        }
    }

    triggerPlayerHit() {
        this.state = 'IDLE';
        this.audio.playHit();
        this.screenShake = 15;
        this.playerHP = Math.max(0, this.playerHP - 25);
        this.updateHUD();

        if (this.playerHP <= 0) {
            alert('你败了！(死)');
            this.playerHP = 100;
            this.enemyPosture = 0;
            this.updateHUD();
        }
    }

    executeDeathblow() {
        this.deathblowOverlay.classList.add('hidden');
        this.audio.playClang();
        this.enemyPosture = 0;
        this.state = 'IDLE';
        this.updateHUD();
    }

    updateHUD() {
        this.enemyPostureBar.style.width = `${this.enemyPosture}%`;
        this.playerHpBar.style.width = `${this.playerHP}%`;
    }

    spawnSparks(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.02,
                color: Math.random() > 0.3 ? '#ffcc00' : '#ff3300'
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    loop(now) {
        this.update(now);
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }

    update(now) {
        // 更新震屏效果
        if (this.screenShake > 0) this.screenShake *= 0.85;

        // 更新弹反成功弹射动画
        if (this.state === 'PARRY_ANIM' && this.bounceVector) {
            const b = this.bounceVector;
            const progress = Math.min(1, (now - b.startTime) / b.duration);
            const ease = Easings.easeOutExpo(progress);
            this.cursorPos.x = b.startX + (b.endX - b.startX) * ease;
            this.cursorPos.y = b.startY + (b.endY - b.startY) * ease;

            if (progress >= 1) {
                this.state = 'IDLE';
                this.bounceVector = null;
            }
        }

        // 更新敌方攻击轨迹移动
        if (this.state === 'ATTACKING') {
            const pattern = this.currentPattern;
            const seg = pattern.segments[this.currentSegmentIndex];
            const elapsed = now - this.segmentStartTime;
            let t = Math.min(1, elapsed / seg.duration);
            
            const easedT = Easings[seg.easing](t);
            this.cursorPos = getBezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, easedT);

            if (t >= 1) {
                if (this.currentSegmentIndex < pattern.segments.length - 1) {
                    this.currentSegmentIndex++;
                    this.segmentStartTime = now;
                } else {
                    // 已到终点，玩家未弹反 -> 受到伤害
                    this.triggerPlayerHit();
                }
            }
        }

        this.updateParticles();
    }

    render() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 应用屏幕震动
        if (this.screenShake > 0.5) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(dx, dy);
        }

        // 1. 绘制背景参考轴与判定区 (Player Base Zone)
        const playerCenter = { x: 300, y: 570 };
        this.ctx.beginPath();
        this.ctx.arc(playerCenter.x, playerCenter.y, 25, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#c9a063';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(playerCenter.x, playerCenter.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff4500';
        this.ctx.fill();

        // 2. 绘制敌方出刀起点
        this.ctx.beginPath();
        this.ctx.arc(300, 100, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = '#c9a063';
        this.ctx.fill();

        // 3. 绘制多段贝塞尔攻击轨迹
        const pattern = this.currentPattern;
        pattern.segments.forEach((seg, idx) => {
            this.ctx.beginPath();
            this.ctx.moveTo(seg.p0.x, seg.p0.y);
            this.ctx.bezierCurveTo(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y, seg.p3.x, seg.p3.y);
            
            // 最后一段高亮显示判定段
            if (idx === pattern.segments.length - 1) {
                this.ctx.strokeStyle = 'rgba(255, 69, 0, 0.6)';
                this.ctx.lineWidth = 3;
            } else {
                this.ctx.strokeStyle = 'rgba(201, 160, 99, 0.3)';
                this.ctx.lineWidth = 2;
            }
            this.ctx.setLineDash([6, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });

        // 4. 绘制火花粒子
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, Math.random() * 3 + 1, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });

        // 5. 绘制当前剑锋光标 (Cursor)
        if (this.state === 'ATTACKING' || this.state === 'PARRY_ANIM') {
            this.ctx.beginPath();
            this.ctx.arc(this.cursorPos.x, this.cursorPos.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowColor = '#ff4500';
            this.ctx.shadowBlur = 12;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        this.ctx.restore();
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new GameEngine();
});
