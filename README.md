# BladeTrace

[简体中文](README.zh-CN.md)

BladeTrace is a standalone browser prototype for designing and practicing deflection timing on multi-segment cubic Bézier attack paths.

![BladeTrace social preview](docs/social-preview.png)

## What it does

- Moves an enemy blade cursor through configurable multi-segment cubic Bézier paths with per-segment easing and duration.
- Opens a precision parry window near the terminal strike, with easy, standard, hard, and pattern-defined timing options.
- Resolves perfect deflects, player hits, enemy posture, enemy HP, and the deathblow flow.
- Includes six attack presets, including delayed slashes, flurries, overhead attacks, a spiral thrust path, and a deceptive pause.
- Shows optional control handles, segment labels, cursor trails, synthesized Web Audio feedback, and automatic attack looping.
- Includes a local, in-page canvas editor for the selected attack: select a segment and drag P0–P3 control points, the red `R` hurtbox handle, or the orange `W` parry-window handle directly on the runtime view. Splitting and deletion are available from a compact toolbar; names, exact values, duration, and easing remain in an optional advanced panel. The canvas previews the exact final path covered by the timing-only parry window. Shared endpoints stay continuous and a refresh discards edits.

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

Build enemy posture with four perfect deflects, then execute the deathblow. A player hit reduces player HP and resets enemy posture. Use the controls to switch patterns, timing windows, wireframe visibility, auto-looping, and sound. In canvas edit mode combat is paused: click a curve segment, drag its labeled points, drag `R` to resize the fixed player hurtbox, or drag orange `W` along the path to change the built-in parry window. Dragging `W` automatically enables the pattern-defined timing for the current practice. The hurtbox is fixed at the player position; only an attack endpoint inside it resolves as a hit, independently of the timeline-only parry window.

## Development

From the repository root, the checked commands are:

```powershell
node --check app/game.js
node tools/verify-app.mjs
```

The second command checks the standalone entry point, required controls, merged gameplay hooks, accessibility markers, and the absence of remote runtime assets. A real-browser smoke test was also run for this integration, but no browser test harness is committed yet.

## Repository layout

```text
app/       Current fused, runnable prototype
docs/      Fusion audit, proposed architecture, roadmap, and social preview assets
tools/     Deterministic static verification
```

Read [the fusion audit](docs/fusion-audit.md) for the feature-by-feature merge, [the proposed architecture](docs/architecture.md) for the post-acceptance module plan, and [the roadmap](docs/roadmap.md) for the staged direction.

## Status and limits

The core ordinary-attack training loop and an in-memory local pattern editor are implemented as a lightweight prototype. The editor does not save, import, export, or write source files; reloading restores the page's initial presets. The future architecture is planned but has not been applied: the current runtime is intentionally a single static `app/game.js` file.

Player posture, blocking, thrust counters, sweep jumps, persistent/shareable pattern configurations, and cross-browser compatibility testing beyond local Edge smoke coverage are not implemented. After fusion acceptance, the original demo source and design documents were removed; the fusion audit remains in `docs/`, and Git history retains the original material.

## License

No open-source license is currently included in this repository.
