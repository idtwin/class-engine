# Design System: ESL Arena V2.0 (Glacial Command)
**Project ID:** 2787423847497300939

## 1. Visual Theme & Atmosphere
**Theme:** "Glacial Command" — Crisp, clean, hyper-modern tactical interface. Built on deep abyss blacks and piercing Ice Blue accents. It feels surgically precise and high-tech.
**Core Aesthetic:** Solid, High-Contrast, Data-Driven. Absolute rejection of blurry glassmorphism in favor of sharp, functional hierarchy.
**Brand Personality:** Intense, competitive e-sports energy tuned for high-stakes classroom gameplay. Easy to read on a projector in any lighting environment.

## 2. Depth & Elevation Architecture
Unlike flat designs, the Hazard Protocol relies on stark overlapping layers to provide physical depth.

| Layer | Hex Code | Role |
|-------|----------|------|
| **Level 0 (The Void)** | `#050508` | Deepest background beneath scanlines. |
| **Level 1 (Surface)** | `#14141E` | Core HUD containers, top nav, scoreboard dock. |
| **Level 2 (Lifted)** | `#1F1F2E` | Interactive tiles, active states, modals. |

*Note: Tiles should employ a hard bottom shadow (`box-shadow: 0 4px 0 #000000;`) to create the illusion of physical switches.*

## 3. "Glacial Command" Color Palette

| Token Name | Hex Code | Role |
|------------|----------|------|
| **Ice Blue** | `#AEE6FF` | Primary Actions. The main accent for CTAs, success states, confirmed answers, and interactive borders. Cool, professional, and crisp. |
| **Titanium Silver**| `#D1D9E6`| Secondary data, muted terminal readouts. |
| **Emergency Red** | `#FF3B3B` | Errors, negative feedback, timer urgency. |
| **Border Hard** | `#2a2a35` | Subtle structural borders delineating UI sections. |
| **Text Bright**| `#ffffff` | Primary Readability. |
| **Text Data** | `#a3a3a3` | Muted numeric identifiers, scanline metadata. |

## 4. Component Rules

### Containers (The HUD Panel)
- **Backgrounds:** Strictly solid. No `backdrop-filter: blur()`.
- **Base Style:** Solid background `var(--surface)`.
- **Corner Brackets:** Panels use `::before`/`::after` elements to inject 12px structural target bracket corners (Ice Blue).
- **HUD Border:** 1px solid `var(--border-hard)`.

### Buttons (Tactical Slants)
- **Geometry:** Industrial clip-paths. Always cut the corners using `clip-path: polygon(...)` (e.g., 8px diagonal slices on top-left and bottom-right).
- **Base (Ghost):** Transparent with a 1px Ice Blue border. Blue text.
- **Base (Primary):** Solid Ice Blue with Black text.
- **Hover States:** Intense box-shadow glow, solid background transition. The interactive element MUST feel immediately responsive. 

### Global Environmental Effects
- **Tactical Grid:** `linear-gradient` grid overlay painted onto `body::before` (dim blue intersections).
- **Scanlines:** `repeating-linear-gradient` on `body::after` across the entire viewport.

## 5. Typography Rules

- **Font Families:**
  - **Headlines / Data Metrics:** `Space Grotesk` or `JetBrains Mono` (Bold 700/800).
  - **Body / Labels:** `Syne` or `Space Grotesk`.
- **Identifiers:** Any small utility text (e.g. `SYSTEM_ONLINE`, `TEAM_ID`, `PTS`) must be Monospace, Uppercase, and heavily letter-spaced (e.g. `letter-spacing: 0.12em`).

## 6. Development Workflow Rules
1. **Never use Glassmorphism.** Everything must be a solid layer.
2. **Never use default rounded corners.** Buttons and cards get clip-paths or sharp borders with tactical brackets.
3. Every new page/game must wrap its core containers in `.hud-panel` classes to inherit the bracket decorations.

## 7. Migration Checklist
- [x] Update Design Docs (`.stitch/DESIGN.md`).
- [x] Reconfigure tokens in `globals.css`.
- [ ] Migrate `Chain Reaction` (Strip legacy CSS modules).
- [ ] Migrate `Picture Reveal` (Convert to HUD panels + open guessing UI polish).
- [ ] Overhaul `app/play/[code]` (Player Phone recon theme).
- [ ] Update other legacy games (Fix-It, Odd One Out, Hot Seat, Rapid Fire, Wheel, WYR).
