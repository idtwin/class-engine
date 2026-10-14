# ESL ARENA V2.0 — HUD DESIGN SYSTEM
## STRICT COMMAND BRIDGE GUARDRAILS

> [!IMPORTANT]
> This document contains the PROTECTED STYLES for the ESL Arena Command Bridge. Any deviation from these rules will break the "Tactical HUD" aesthetic.

### 1. Typography Lock (FIXED UNITS ONLY)
- **NO FLUID SCALING**: Using `clamp()`, `vw`, `vh`, or `rem` for font sizes within the TopNav or HUD panels is **STRICTLY FORBIDDEN**.
- **Fixed Units**: All typography in the Command Bridge must use `px` units to maintain high-density tactical alignment.
- **Font Roles**:
    - **Primary Brand / Technical Data**: `JetBrains Mono` (e.g., ESL ARENA V2.0, personnel counts).
    - **Navigation / HUD Labels**: `Syne` (e.g., ARCADE, TEAMS & ROSTER, timers).

### 2. Core HUD Tokens (Vercel Blueprint)
- **Brand Main**: `14px JetBrains Mono`, Weight 700, Letter-spacing 0.1em, Color: Mint (`#00FFD5`).
- **Nav Links**: `11px Syne`, Weight 700, Letter-spacing 1.32px, Color: Mint (`#00FFD5`).
- **Timer / Metrics**: `10px Syne`, Weight 700, Color: Team Green (`#BEEF00`).
- **Status Labels**: `9px Mono`, Color: `rgba(255, 255, 255, 0.4)`.

### 3. Layout Constraints
- **Nav Height**: Strictly `64px`.
- **Density**: Prefer compact spacing. Do not increase padding or margins for "readability" unless requested.
- **Backgrounds**: Flat, dark surfaces only. No glassmorphism, blur effects, or bulky containers in the Top Navigation.

### 4. Verification Flow
Before making ANY UI change:
1. Check the local computed style against these tokens.
2. If unsure, visit the Vercel production deployment to verify the "Yesterday" baseline.
3. NEVER assume "larger is better."
