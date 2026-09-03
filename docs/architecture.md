# BladeTrace 架构设计（拟议，尚未重构）

> 当前交付仍是零依赖静态网页。浏览器整合位于 [`app/game.js`](../app/game.js)，阶段 1 已引入纯规则 [`app/pattern-validation.js`](../app/pattern-validation.js) 和纯数据 [`app/attack-patterns.js`](../app/attack-patterns.js)，其中已包含 Boss 阶段验证与解析。本文件描述尚未实施的完整重构计划。

## 目标与边界

BladeTrace 的核心不是一般意义上的“画一条曲线”，而是让开发者能把一招攻击的空间路径与时间节奏分开描述、观察和验证，同时让玩家把同一份数据体验为清晰、可重复的弹反练习。一个招式需要表达：

- 多段连续的贝塞尔轨迹；
- 每段的时间、缓动和语义标签；
- 仅按时间轴、在最后有效时段开放的弹反窗口；
- 固定在玩家位置、只在攻击终点结算的空间受击区；
- 命中、弹反、架势崩溃、忍殺等可审计的战斗状态变化；
- 对应的 Canvas、HUD、音效和粒子反馈。
- Boss 的人格、机制出处说明、架势驱动阶段、阶段招式池、阶段推进倍率与所见即所得的阶段预览／直接练习。

架构要服务这件事，而不是为了拆文件而拆文件。浏览器输入、DOM 和 Canvas 不能决定规则；同一套规则将来应该能被单元测试、回放工具和招式编辑器调用。

## 当前实现的限制

目前的 `GameEngine` 同时保存战斗状态、采样轨迹、监听 DOM、渲染 Canvas、调用音效并管理粒子。阶段 1 的 `pattern-validation.js` 已通过公开的 `validateAttackPattern(pattern)`、`validateBossLibrary(bosses, patterns)`、`resolveBossPhase(boss, posture)` 和 `calculatePhasePostureGain(phase, pattern)` seam 校验内置招式、Boss 阶段与编辑后的配置，但它尚未取代浏览器运行时的战斗状态。当前页面内的编辑器仍直接修改 `GameEngine` 持有的内存招式／Boss 副本：默认通过运行时画布的 P0–P3、R（受击区）与 W（弹反窗）手柄调整，直接点击阶段卡预览或直接开始该阶段练习，复杂字段才按需展开；它会维持相邻段连接点连续，并可调整固定位置的玩家受击区半径、招式内置判定窗、阶段阈值、强调色和招式池。攻击仅在终点用受击区结算，弹反窗则只按时间轴判断；阶段由敌方架势和阶段推进倍率共同决定节奏。编辑器尚不提供持久化或导入导出。它适合快速验收，但这些职责共享一个实现后，招式编辑、Boss 阶段、回放、自动测试和特殊攻击会相互牵连。

下一次重构应保留行为，不以“改用框架”为目标；继续保持纯静态部署和无第三方运行时依赖，除非后续需求明确改变这一点。

## 拟议目录

```text
src/
├── model/
│   ├── attack-pattern.ts       # 招式、规则、运行时快照的纯数据
│   └── combat-event.ts         # 由规则层发出的领域事件
├── core/
│   ├── pattern-compiler.ts     # 预计算时长、校验连续性与配置约束
│   ├── trajectory-engine.ts    # 采样多段贝塞尔轨迹和切线
│   └── combat-session.ts       # 战斗 FSM、数值结算和事件序列
├── config/
│   └── attack-patterns.ts      # 预设招式库；日后可替换为 JSON 导入
├── adapters/
│   ├── browser-input.ts        # 键盘、按钮、画布指针 → 战斗命令
│   ├── canvas-renderer.ts      # 快照和事件 → Canvas
│   ├── hud-renderer.ts         # 快照和事件 → DOM HUD
│   ├── web-audio.ts            # 领域事件 → Web Audio
│   └── effects-renderer.ts     # 领域事件 → 粒子与震屏
├── app/
│   └── bootstrap.ts            # 组合模块和 requestAnimationFrame 循环
└── test/
    ├── trajectory-engine.test.ts
    ├── combat-session.test.ts
    └── pattern-compiler.test.ts
```

`src/` 是未来状态；现在的 `app/` 只进行了数据与配置校验的最小提取，未开始完整重构。

## 模块、接口与 seam

以下术语按“深模块”设计：模块的 **Interface** 是调用方必须知道的完整事实；**seam** 是可以替换行为而不改调用方的位置；深度来自用很小的 Interface 隐藏足够多的复杂度。

### 1. `PatternCompiler`：配置 seam

**职责**：接收一个原始 `AttackPattern`，验证每段时长和缓动名称、检查相邻段 `p3 → p0` 的 C0 连续性、标出最后的打击段，并计算累计时长。

**Interface（拟议）**：

```ts
compilePattern(pattern: AttackPattern): CompiledPattern
compileCatalog(patterns: AttackPattern[]): PatternCatalog
```

调用方不需要知道累计时长数组、缓动函数查表或错误细节如何实现。将来 JSON、编辑器草稿和内置 TypeScript 预设都可以成为这个 seam 两侧的不同 Adapter。

### 2. `TrajectoryEngine`：时间 → 位置 seam

**职责**：根据一个已编译招式与绝对经过时间，定位当前段，应用该段缓动，计算贝塞尔位置和可选切线。

**Interface（拟议）**：

```ts
sampleTrajectory(pattern: CompiledPattern, elapsedMs: number): TrajectorySample
```

`TrajectorySample` 至少含 `position`、`segmentIndex`、`remainingMs` 和 `isStrikeSegment`。贝塞尔公式、分段定位、缓动映射全部被封装在模块内；渲染层和战斗规则无需再次计算这些内容。

### 3. `CombatSession`：战斗规则的主 seam

这是最应做成深模块的部分。它拥有 FSM、玩家 HP、敌方架势、弹反窗口、Boss 阶段门槛、忍殺门槛和自动循环的规则，不接触 DOM、Canvas 或 AudioContext。当前普通攻击循环中，完美弹反只增加敌方架势，不包含敌方 HP 伤害；架势达到阶段阈值后，下一轮攻击切入对应阶段招式池。

**Interface（拟议）**：

```ts
createCombatSession(pattern: CompiledPattern, rules: CombatRules): CombatSession

session.dispatch({ type: "START" | "PARRY" | "RESET", atMs: number }): CombatTransition
session.tick(atMs: number): CombatTransition
session.snapshot(): CombatSnapshot
```

`CombatTransition` 返回新的快照及 `AttackStarted`、`Parried`、`BossPhaseChanged`、`PlayerHit`、`AttackMissed`、`DeathblowReady`、`DeathblowExecuted` 等事件。`CombatSession` 在终点时以固定的玩家位置和受击区半径结算 `PlayerHit` 或 `AttackMissed`；弹反窗只比较时间戳；阶段只根据架势阈值解析。输入 Adapter 和渲染 Adapter 只消费结果，不自行判断“是否在 150ms 窗口内”。这让规则可以被固定时间戳的测试直接覆盖。

### 4. 呈现与外部设备 Adapter

这些 Adapter 通过事件 seam 连接到 `CombatSession`，不反向写入状态：

| Adapter | 接收 | 输出/副作用 |
| --- | --- | --- |
| `BrowserInputAdapter` | 键盘、按钮、画布指针 | 标准化的 `START`、`PARRY`、`RESET` 命令 |
| `CanvasRenderer` | `CombatSnapshot`、视觉事件 | 轨迹、控制点、光标、尾迹、判定环 |
| `HudRenderer` | `CombatSnapshot`、文本事件 | HP、架势、状态、按钮可用性、无障碍属性 |
| `WebAudioAdapter` | 战斗事件 | 延迟初始化的 Web Audio 合成音效 |
| `EffectsRenderer` | 战斗事件与帧间隔 | 粒子、震屏；它不改变战斗结果 |

这样可以在不改战斗规则的情况下替换 Canvas，或在测试中以记录事件的 Adapter 代替音效和粒子。

## 拟议数据模型

```ts
type AttackKind = "NORMAL" | "THRUST" | "SWEEP";

interface Point {
  x: number;
  y: number;
}

interface AttackSegment {
  label: string;
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
  durationMs: number;
  easing: EasingName;
}

interface AttackPattern {
  id: string;
  name: string;
  description: string;
  kind: AttackKind;
  parryWindowMs: number;
  playerHurtboxRadius: number;
  damage: number;
  postureGain: number;
  commitCueLabel: string;
  commitCueLeadMs: number;
  segments: AttackSegment[];
}

interface BossPhase {
  id: string;
  name: string;
  description: string;
  postureThreshold: number;
  postureGainScale: number;
  accentColor: string;
  patternIds: string[];
}

interface Boss {
  id: string;
  name: string;
  description: string;
  inspiration: { kind: string; sourceGame: string; lesson: string };
  visualMotif: { type: string; label: string };
  phases: BossPhase[];
}
```

`kind` 目前固定为 `NORMAL`。只有在“突刺需要看破、横扫需要跳跃”的输入与结算规则经过普通攻击闭环验证后，才在 `CombatSession` 增加对应状态；不要先在 UI 中伪装为已有玩法。

## 运行流

```text
浏览器输入
    │
    ▼
BrowserInputAdapter ──命令──► CombatSession ──快照/事件──► HudRenderer
                                     │                         CanvasRenderer
                                     └──────────────────────► WebAudioAdapter
                                                                EffectsRenderer

BossCatalog + PatternCatalog ──► PatternCompiler ──► TrajectoryEngine ──► CombatSession
```

唯一的规则权威是 `CombatSession`；唯一的轨迹采样权威是 `TrajectoryEngine`。这样既避免在 HUD、Canvas 和输入处理里复制窗口判定，又让错误具有很好的 locality。

## 测试策略

1. `PatternCompiler`：拒绝空段、负时长、未知缓动和不连续的 `p3 → p0`；验证每个预设和 Boss 阶段招式池可编译。
2. `TrajectoryEngine`：在每段起点、终点和边界时间采样，验证坐标、段索引和剩余时间。
3. `CombatSession`：固定时间戳测试早按、窗口内弹反、阶段阈值切换、逾时的终点受击与攻击落空、路径中途穿过受击区但终点不命中、4 次架势满、忍殺、重置与自动循环；另验证改变受击区不会改变弹反窗口。
4. 浏览器冒烟：使用真实浏览器检查 Boss 切换、阶段卡预览、阶段招式池编辑、按钮、Space、画布点击、HUD 文本、键盘焦点和 320/768/1024/1440 宽度。

这些测试都穿过模块的 Interface，而不是窥探内部变量。

## 迁移原则

1. 先把当前融合版的行为写成测试和招式快照；不同时改规则与目录结构。
2. 首先抽出纯函数 `PatternCompiler` 与 `TrajectoryEngine`，保证画面不变。
3. 再让 `CombatSession` 成为唯一状态源，最后迁移 Browser/Canvas/Audio Adapter。
4. 每个小阶段都保留静态 HTML 入口和浏览器冒烟测试；若行为有差异，先修复规则而不是由渲染层补丁掩盖。

详细实施顺序见 [`roadmap.md`](roadmap.md)。
