# BladeTrace

[简体中文](README.zh-CN.md)

BladeTrace is a standalone browser practice sandbox and design tool for multi-segment cubic Bézier attack paths. It lets action-game developers inspect and tune attack rhythm while giving timing-focused players a direct, repeatable deflection challenge without requiring high-fidelity presentation.

![BladeTrace social preview](docs/social-preview.png)

## What it does

- Moves an enemy blade cursor through configurable multi-segment cubic Bézier paths with per-segment easing and duration.
- Opens a precision parry window near the terminal strike. The first-run default is a 220ms practice setting; pattern-defined, 150ms Shura, and 90ms hardship settings remain available.
- Resolves perfect deflects, player hits, enemy posture, and the deathblow flow; perfect deflects build posture rather than dealing enemy HP damage.
- Includes 13 personality-led, multi-phase Bosses: three BladeTrace originals and 10 original mechanical homages spanning five action games. Each advances at posture thresholds and owns a distinct phase attack pool; homage Bosses borrow high-level combat lessons only, never characters or source assets.
- Gives every Boss an original, procedural Canvas motif—such as bell ripples, clockwork spokes, mirror tides, lattice lines, or afterimages—so personality is visible without copying game art.
- Includes 29 ordinary-attack presets, from delayed slashes, flurries, overhead attacks, spiral approaches, and deceptive pauses to 20 bespoke Boss signature attacks.
- Validates every shipped pattern for segment continuity, duration, easing, parry-window and hurtbox ranges, plus the terminal hit-or-miss relationship; it also validates Boss inspirations, phase thresholds, phase posture-gain scales, IDs, colors, and attack-pool references.
- Gives each preset a short practice description so players can choose a rhythm while developers can inspect the same underlying data.
- Shows optional control handles, segment labels, cursor trails, synthesized Web Audio feedback, and automatic attack looping.
- Includes a local, in-page canvas editor for the selected attack and Boss phase: select a phase card directly in the runtime view to preview its attack pool and accent color, or start a direct practice run from that phase; add or delete phases, then adjust their name, guidance, posture threshold, color, and attack pool in the optional advanced panel. Attack editing remains direct: drag P0–P3 control points, the red `R` hurtbox handle, or the orange `W` parry-window handle. Shared endpoints stay continuous and a refresh discards edits.

## Run it

No build step or web server is required. Open [app/index.html](app/index.html) in a current browser.

The integrated prototype was smoke-tested locally in Microsoft Edge during this work. Other browsers have not been verified here.

## How to play

| Input | Result |
| --- | --- |
| `Space` while idle | Start the selected attack |
| `Space` while attacking | Attempt a parry |
| `Enter` while idle | Start the selected attack |
| Click the canvas while attacking | Attempt a parry |
| `Space` or the deathblow button when posture breaks | Execute the deathblow |
| Click `进入画布编辑` | Edit the selected attack directly on its runtime trajectory |

Build enemy posture with perfect deflects, then execute the deathblow. At 50% and 75% posture, the active Boss moves to its next phase and switches attack pools; a player hit reduces player HP, resets posture, and returns the Boss to phase I. Later phases halve posture gain, so every phase normally receives at least two successful reads before the next threshold. A phase shift pauses briefly and announces its new beat before combat resumes. New sessions begin at the 220ms practice setting; 150ms is the Shura timing challenge and depends on reading the per-pattern commit cue before the window opens. Use the controls to choose a Boss, switch the current phase's patterns, timing windows, wireframe visibility, auto-looping, and sound. In canvas edit mode combat is paused: click a phase card to preview it or choose **Practice this phase** to start there; drag P0–P3 to edit its selected path, drag `R` to resize the fixed player hurtbox, or drag orange `W` along the path to change the built-in parry window. The advanced panel exposes phase threshold, color, text, and attack-pool edits. The hurtbox is fixed at the player position; only an attack endpoint inside it resolves as a hit, independently of the timeline-only parry window. See the [Boss mechanism homage catalog](docs/boss-mechanical-homages.md) and [human playtest protocol](docs/human-playtest-protocol.md) for the original-content boundary and deliberate human, rather than bot-speed, timing model.

## Development

From the repository root, the checked commands are:

```powershell
node --check app/pattern-validation.js
node --check app/attack-patterns.js
node --check app/game.js
node --test tools/pattern-validation.test.cjs
node tools/verify-app.mjs
```

The test command exercises the public pattern and Boss-phase validation seams with both valid and intentionally invalid fixtures. The final command checks the standalone entry point, required controls, validated shipped patterns and Bosses, accessibility markers, and the absence of remote runtime assets. A real-browser smoke test was also run for this integration, but no browser test harness is committed yet.

## Repository layout

```text
app/       Current fused, runnable prototype
docs/      Fusion audit, proposed architecture, roadmap, and social preview assets
tools/     Deterministic static verification
```

Read [the fusion audit](docs/fusion-audit.md) for the feature-by-feature merge, [the proposed architecture](docs/architecture.md) for the post-acceptance module plan, and [the roadmap](docs/roadmap.md) for the staged direction.

## Status and limits

The core ordinary-attack training loop, 13 posture-driven multi-phase Bosses, and an in-memory local pattern/phase editor are implemented as a lightweight prototype. The editor does not save, import, export, or write source files; reloading restores the page's initial presets. The current phase adds pure `validateAttackPattern`, `validateBossLibrary`, `resolveBossPhase`, and `calculatePhasePostureGain` seams plus a data-only `app/attack-patterns.js` catalog, while browser integration remains in `app/game.js`; the larger proposed architecture has not been applied.

Player posture, blocking, thrust counters, sweep jumps, persistent/shareable pattern configurations, and cross-browser compatibility testing beyond local Edge smoke coverage are not implemented. Enemy HP is intentionally out of the current ordinary-attack loop: the player practices toward an enemy posture break and deathblow instead. After fusion acceptance, the original demo source and design documents were removed; the fusion audit remains in `docs/`, and Git history retains the original material.

## License

No open-source license is currently included in this repository.
