# Design System: Classroom Engine (Arcade Mode)
**Project ID:** 2787423847497300939

## 1. Visual Theme & Atmosphere
**Theme:** "Kinetic Command Center" — A projector-first, high-energy arcade aesthetic designed for the back of a large classroom.
**Core Aesthetic:** Dark, Minimal, and Functional.
**Brand Personality:** "Fun first, learning second." Professional enough for a teacher, exciting enough for a student.

## 2. Color Palette & Roles

| Token Name | Hex Code | Role |
|------------|----------|------|
| Background | `#0a0a0a` | Primary page background (deep near-black) |
| Surface | `#0d0d0d` | Header bar, overlays |
| Surface-2 | `#111111` | Scoreboard dock |
| Surface-3 | `#1a1919` | Cards, containers, panels |
| Accent | `#9cff93` | Primary accent (soft neon green) |
| Accent-Bright | `#00FF41` | High-energy accent, CTAs |
| Foreground | `#ffffff` | Primary text |
| Text-Muted | `rgba(255, 255, 255, 0.6)` | Secondary text |

**Team Accent Colors:**
| Team | Hex Code | Use |
|------|----------|-----|
| Alpha | `#9cff93` | Neon Green |
| Bravo | `#00E5FF` | Cyan |
| Charlie | `#FFB800` | Amber |
| Delta | `#FF2D78` | Hot Pink |

## 3. Typography Rules

**Font Families:**
- **Headlines/Scores:** Space Grotesk (Bold 700, Black 800)
- **Body/Labels:** Space Grotesk (Regular 400, Medium 500)

**Scale:**
- Hero/Scores: `clamp(2rem, 5vw, 4rem)` — readable from 20+ feet
- Headings: `clamp(1.5rem, 3vw, 2.5rem)`
- Body: `1rem` to `1.25rem`
- Labels: `0.75rem` uppercase with `0.1em` letter-spacing

## 4. Component Styling

### Buttons
- **Primary:** `#00FF41` background, `#000000` text, 6px border-radius
- **Secondary:** `#1a1919` background, `#ffffff` text, 1px `#333` border
- **Hover State:** 4px neon green left-border accent
- **Active State:** Subtle scale-down (transform: scale(0.98))

### Cards/Containers
- Background: `#1a1919`
- Border: 1px solid `rgba(255,255,255,0.08)`
- Border-radius: 8px
- Hover: 4px neon green left border accent
- Padding: 1.5rem

### Header Bar (HUD)
- Height: 56px
- Background: `#0d0d0d`
- Bottom accent: 1px solid `#9cff93`

### Timer Ring
- Size: 100x100px
- Track: Dark (`#1a1919`)
- Stroke: Neon green (`#00FF41`)
- Stroke-width: 4px

### Unified Scoreboard
- Height: 80px
- Background: `#111111`
- Team columns with ghost vertical dividers
- Top accent: 2px solid team color

## 5. Layout Principles

### The Unified Shell (3-Tier Layout)

**A. Header Bar (Utility Layer)**
- Fixed top, 56px height
- Left: "ARCADE_COMMAND" branding + nav links
- Right: Circular timer

**B. Gameplay Arena (Primary Layer)**
- Centered content with max-width constraints
- Massive typography for projector visibility
- Clean grid layouts

**C. Scoreboard (Social Layer)**
- Fixed bottom, 80px height
- Always visible across all games
- 4 team columns with equal width

### Grid System
- Gap: 1rem to 2rem
- Border-radius: 8px standard, 6px for buttons
- Subtle grid texture on background (optional)

## 6. Game-Specific Layouts

| Game | Grid | Points Color | Special |
|------|------|-------------|---------|
| Jeopardy | 5x5 | Amber (#FFB800) | Unified scoreboard |
| Hot Seat | Single target | N/A | Red strikethrough hints |
| Odd One Out | 4-card grid | N/A | "WHICH WORD DOES NOT BELONG?" header |
| Picture Reveal | 4x4 tiles | N/A | Multiple-choice/free-text toggle |
| Fix It! | Terminal UI | N/A | Streak Meter + Arsenal Tray |

## 7. Key UX Principles
- **Projector-First:** Every element readable from 20 feet
- **Standardized HUD:** Timer and scoreboard positions never change
- **Zero-Prep Energy:** Minimize dashboards; maximize "launch and play"
