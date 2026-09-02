# BladeTrace Social Preview Design Ledger

```yaml
repository:
  name: "BladeTrace"
  url: "https://github.com/onovich/BladeTrace"
  visibility: unknown
  default_branch: "main"
  local_checkout: "D:/WebProjects/BladeTrace"

evidence:
  mode: runtime-tested
  inspected:
    - path_or_url: "app/index.html"
      proves: "The standalone browser entry point, controls, HUD, and canvas composition."
    - path_or_url: "app/game.js"
      proves: "Multi-segment cubic Bezier trajectories, per-segment easing, a 150ms default window, a fixed player hurtbox resolved at the attack endpoint, and +25 posture on a perfect deflect."
    - path_or_url: "docs/fusion-audit.md"
      proves: "The accepted fusion boundary: demo1 supplies the visual and interaction base, while demo2 supplies observable, data-driven combat mechanisms."
  claim_boundaries:
    - "The cover depicts a conceptual trajectory artifact, not a captured product screenshot."
    - "No browser compatibility claim is implied beyond the local Microsoft Edge runtime smoke test performed for this integration."

content:
  promise: "Design and test deflection rhythm on multi-segment Bezier attack paths."
  proof:
    - "A two-segment enemy-to-player cubic Bezier path mirrors the default delayed slash."
    - "The shown 900ms and 220ms segment labels are the default delayed slash durations."
    - "The shown 150ms parry window and +25 posture outcome are implemented in app/game.js."
    - "The target ring represents the fixed player hurtbox, which is independent from the time-only parry window."
  exclude:
    - "Unsupported special-attack mechanics such as thrust counters or sweep jumps."
    - "Unverified browser support, gameplay balance, and production-readiness claims."

cold_start_route:
  semantic_skeleton:
    objects:
      - "enemy blade origin"
      - "player hurtbox target"
      - "multi-segment Bezier trajectory"
      - "timing window and posture result"
    actions:
      - "sample a trajectory over time"
      - "open a time-only parry window near the terminal attack point"
      - "resolve an un-parried endpoint against the independent player hurtbox"
      - "convert a perfect deflect into enemy posture"
    topology: "A vertical enemy-to-player sequence, with a slow windup segment followed by a terminal strike segment."
    outcome: "A design-aware player can read attack rhythm and practice a precise deflect."
  representation: structural-diagram
  material_plan:
    background_surface_relation: "Demo1's warm near-black field with a restrained dark-brown simulation panel."
    character: "Technical combat diagram, using the repository's gold and ember palette instead of a generic dashboard."
    semantic_texture_or_grid: "A single vertical alignment line establishes the enemy-to-player axis; there is no decorative grid."
    contrast_and_focus: "BladeTrace title is the primary reading target; the gold/ember trajectory is the product proof."
    region_separation: "Copy occupies the left field; a bordered simulation stage owns the right field."
  direction_hypotheses:
    chosen: "Structural diagram: an editorial left title field beside a vertical trajectory stage that preserves the product's true topology."
    rejected: "Typographic identity with an abstract slash mark."
    rejection_reason: "It would identify the theme but would not prove the multi-segment timing tool that makes BladeTrace specific."

composition:
  production_route: code-native-svg
  regions:
    - name: "identity"
      bounds: "72,88 to 645,552"
      purpose: "Repository name, concrete promise, and three evidence-bound facts."
    - name: "trajectory-stage"
      bounds: "720,72 to 1208,568"
      purpose: "A self-contained conceptual proof of the default attack's enemy-to-player path."
  line_ledger:
    - element: "stage center axis"
      role: "axis"
      endpoints_or_bounds: "960,142 to 960,506"
      evidence: "The app places the enemy origin above the player target on a centered vertical axis."
    - element: "windup Bezier"
      role: "trajectory"
      endpoints_or_bounds: "960,166 to 838,390"
      evidence: "The default delayed slash begins with a 900ms cubic Bezier windup."
    - element: "strike Bezier"
      role: "trajectory"
      endpoints_or_bounds: "838,390 to 960,500"
      evidence: "The default delayed slash ends in a 220ms cubic Bezier strike at the player target."
    - element: "control-handle lines"
      role: "connector"
      endpoints_or_bounds: "Each trajectory endpoint connects to its actual cubic control points."
      evidence: "The wireframe view in app/game.js renders the same control relationships."

version:
  baseline: "docs/social-preview-v2.svg and docs/social-preview-v2.png"
  candidate: "docs/social-preview-v3.svg and docs/social-preview-v3.png; promoted to docs/social-preview.svg and docs/social-preview.png"
  preservation_contract:
    identity_anchors:
      - "BladeTrace name"
      - "Warm near-black, gold, and ember palette"
      - "Vertical enemy-to-player trajectory"
    protected_strengths:
      - "Legible title at thumbnail size"
      - "One clear product proof rather than a fabricated UI capture"
    allowed_changes:
      - "Conceptual recomposition of the trajectory inside a wide social-preview frame"
      - "Terminology correction from player hit zone to player hurtbox"
      - "English-only cover annotations and spacing adjustments that preserve thumbnail legibility"
    forbidden_changes:
      - "Invented game statistics, screenshots, special attacks, or GitHub endorsement"
  comparison_scores:
    identity_fidelity: "preserved"
    product_clarity: "improved: every visible annotation uses one English vocabulary, including the implemented fixed player hurtbox"
    aesthetic_authorship: "preserved"
    abstraction_fit: "preserved"
    topology_fidelity: "preserved"
    material_quality: "preserved"
    composition: "preserved"
    thumbnail_legibility: "pass on light and dark review-sheet surrounds"
    line_semantics: "preserved"
    fragment_integrity: "preserved"
  vetoes: []
  verdict: promote
  reason: "The candidate preserves the palette, vertical attack topology, and legibility while making all visible annotations English and retaining the precise player-hurtbox terminology."

output:
  svg: "docs/social-preview.svg"
  png: "docs/social-preview.png"
  review_sheet: "docs/social-preview-review.png"
  width: 1280
  height: 640
  bytes: 58471
  mechanical_validation: pass
  full_size_review: pass
  thumbnail_light_review: pass
  thumbnail_dark_review: pass
  batch_contact_review: not-applicable
  retained_versions:
    - "docs/social-preview-v1.svg / .png / -review.png (baseline)"
    - "docs/social-preview-v2.svg / .png / -review.png (previous selected version)"
    - "docs/social-preview-v3.svg / .png / -review.png (current selected version)"

authorization:
  readme_modified: true
  github_uploaded: false
  upload_verification: not-requested
```
