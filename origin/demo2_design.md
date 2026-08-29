# 贝塞尔轨道弹刀模拟系统 (Sekiro Deflection Engine) 架构设计与技术文档

本文档旨在为接手《只狼》弹刀模拟器项目的开发人员提供完整的系统架构、核心数学模型、数据结构及逻辑流转说明，确保后续维护与扩展的顺畅进行。

---

## 1. 项目概述与核心目标

本项目是一个专注于**高精度攻防节奏模拟**的 2D/2.5D 核心战斗引擎。通过将敌方招式拆解为**多段拼接的贝塞尔曲线（Bezier Spline）**，并结合**分段缓动函数（Segmented Easing Functions）**，实现对“蓄力-急突-迟滞-重击”等复杂刀法招式的参数化表达。

### 核心机制说明
* **招式轨迹**：敌方剑锋（光标）沿由多段三阶贝塞尔曲线构成的路径滑动。
* **招式前摇**：多段曲线的组合即构成多阶段前摇，每一段可配置不同的插值速度与缓动曲线。
* **弹反判定**：剑锋接近玩家终点判定区时，开启毫秒级（如 180ms）判定窗口。
* **架势与伤害**：完美弹反会导致剑锋反弹并扣减敌方 HP/累加架势值（Posture）；弹反失败则玩家受损且敌方架势值清空。架势条满（100%）触发处决状态（忍杀）。

---

## 2. 系统核心架构与模块划分

项目采用**数据驱动与单向数据流（Data-Oriented & Single-Direction Flow）**的轻量化架构，降低模块间的耦合度。

```
[ Attack Config (JSON/Script) ]
              │
              ▼
    ┌──────────────────┐
    │  Trajectory Engine│ ── (计算当前帧 2D 坐标与速度向量)
    └─────────┬────────┘
              │
              ▼
    ┌──────────────────┐      [ Input Listener ]
    │  Combat FSM      │ ◄─── (空格/点击判定)
    └─────────┬────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
[ State System ]  [ FX & Render ]
(HP/架势/判定)    (画线/光标/火花粒子)
```

### 主要模块职责表

| 模块名称 | 职责描述 |
| :--- | :--- |
| **Attack Config** | 存储所有敌方招式的起点、控制点、终点、时限及缓动曲线参数。 |
| **Trajectory Engine** | 负责根据全局时间差算定 $t$ 值，执行多段贝塞尔曲线求值与坐标转换。 |
| **Combat FSM** | 管理攻击流程中的各种状态（Idle, Attacking, Parried, Hit, Deathblow）。 |
| **State System** | 记录玩家/敌方的血量（HP）、架势值（Posture），处理属性扣减与判定结算。 |
| **FX & Render** | 渲染场景轨迹线、控制点轴向、光标位置、碰撞火花及 UI 效果。 |

---

## 3. 核心数学原理与算法

### 3.1 三阶贝塞尔曲线 (Cubic Bézier Curve)
单段轨迹采用标准三阶贝塞尔曲线，由起点 $P_0$、控制点 $P_1, P_2$ 及终点 $P_3$ 决定：

$$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3 \quad (t \in [0, 1])$$

### 3.2 组合轨迹与局部 $t$ 映射
假设一条攻击路径由 $K$ 段曲线组成，总时长为 $T_{total}$，第 $i$ 段占比为 $w_i$（$\sum w_i = 1$），总进度为 $	au \in [0, 1]$：

1. **定位当前段**：找到索引 $k$，使得 $\sum_{i=0}^{k-1} w_i \le 	au < \sum_{i=0}^{k} w_i$。
2. **计算局部线性进度 $t_{raw}$**：
   $$t_{raw} = rac{	au - \sum_{i=0}^{k-1} w_i}{w_k}$$
3. **缓动插值映射 $t_{eased}$**：
   $$t_{eased} = 	ext{EasingFunc}_k(t_{raw})$$
4. **求解空间坐标**：将 $t_{eased}$ 代入第 $k$ 段贝塞尔公式计算 $P(x, y)$。

### 3.3 常用缓动函数公式库
* **Linear (匀速进击)**: $f(t) = t$
* **Ease-In (Cubic 蓄力加速)**: $f(t) = t^3$
* **Ease-Out (Expo 疾速下劈/骤停)**: $f(t) = 1 - 2^{-10t}$
* **Ease-In-Out (Sine 曲线过渡)**: $f(t) = -rac{1}{2}(\cos(\pi t) - 1)$

---

## 4. 核心数据结构定义

```typescript
// 二维向量
interface Vector2D {
  x: number;
  y: number;
}

// 缓动类型枚举
enum EasingType {
  LINEAR = 'LINEAR',
  EASE_IN_CUBIC = 'EASE_IN_CUBIC',
  EASE_OUT_EXPO = 'EASE_OUT_EXPO',
  EASE_IN_OUT_SINE = 'EASE_IN_OUT_SINE'
}

// 单段轨道定义
interface TrajectorySegment {
  p0: Vector2D;          // 起点
  p1: Vector2D;          // 控制点 1
  p2: Vector2D;          // 控制点 2
  p3: Vector2D;          // 终点 (也是下一段的 p0)
  durationMs: number;    // 本段持续时长 (ms)
  easing: EasingType;    // 本段采用的缓动算法
  isStrikeSegment: boolean; // 是否为最终打击判定段
}

// 攻击招式预设 (Pattern)
interface AttackPattern {
  id: string;
  name: string;
  segments: TrajectorySegment[];
  parryWindowMs: number; // 判定有效时间窗口 (例如 180ms)
}

// 战斗运行时状态 (Combat Context)
interface CombatState {
  playerHp: number;        // 默认 100
  enemyHp: number;         // 默认 100
  enemyPosture: number;    // 0 - 100
  currentState: FsmState;  // FSM 状态
  currentPatternIndex: number;
  segmentIndex: number;
  segmentProgress: number; // 0.0 ~ 1.0
}
```

---

## 5. 有限状态机 (FSM) 与战斗逻辑

系统状态转换流程图如下：

```
 [ IDLE (等待招式) ]
        │
        ▼ (触发招式)
 [ ATTACKING (轨道移动中) ]
        │
        ├── (处于判定窗口期 + 按下弹反) ──► [ PARRIED (弹反成功) ]
        │                                        │
        │                                        ├── 敌方架势值 +25
        │                                        ├── 剑锋沿切线反弹
        │                                        └── 架势满 ──► [ DEATHBLOW (处决) ]
        │
        └── (光标抵达终点 + 未弹反) ─────► [ HIT_PLAYER (玩家受击) ]
                                                 │
                                                 ├── 玩家 HP -30
                                                 └── 敌方架势值归零 ──► 返回 IDLE
```

### 判定逻辑关键伪代码

```typescript
function updateCombatFrame(deltaTimeMs: number) {
  if (state.currentState !== FsmState.ATTACKING) return;

  // 1. 推进轨道时间与坐标更新
  currentSegmentTime += deltaTimeMs;
  let segment = currentPattern.segments[currentSegmentIndex];
  
  if (currentSegmentTime >= segment.durationMs) {
    // 跨越到下一段轨道
    nextSegment();
    return;
  }

  let tRaw = currentSegmentTime / segment.durationMs;
  let tEased = applyEasing(segment.easing, tRaw);
  currentCursorPos = evaluateBezier(segment, tEased);

  // 2. 判断是否进入完美弹反时间窗口 (靠近终点的最后 WindowMs 毫秒)
  let remainingTotalTime = calculateRemainingTime();
  isInParryWindow = remainingTotalTime <= currentPattern.parryWindowMs;

  // 3. 碰撞与判定处理
  if (playerInput.isParryPressed) {
    if (isInParryWindow) {
      triggerDeflectSuccess(); // 成功弹反
    } else {
      triggerEarlyParryPenalty(); // 过早按键惩罚 (例如缩小后续窗口)
    }
  } else if (remainingTotalTime <= 0) {
    triggerPlayerHit(); // 未按键，直接受击
  }
}
```

---

## 6. 接手与扩展指南 (Developer Handover Guide)

1. **新招式配置 (New Attack Presets)**：
   * 所有招式保存在 JSON 配置文件或预设脚本中。
   * 新增招式时，仅需增加一系列 4 点坐标数组与 `easing` 标记，无需改动核心 FSM 逻辑。
2. **帧率无关性 (Delta-time Lock)**：
   * 轨道插值严禁依赖 `requestAnimationFrame` 的帧次数，必须基于绝对时间戳增量 `deltaTime` 进行 $t$ 值计算，以防止高刷新率屏幕下光标运动过快。
3. **视觉与音效联动扩展接口**：
   * `onParrySuccess(pos: Vector2D)`：触发 Spark 粒子、屏幕震动（Screen Shake）及金属击鸣声。
   * `onPostureMax()`：开启红字“危/忍杀”UI 覆盖层