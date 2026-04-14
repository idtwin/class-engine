# ARCADE_COMMAND — Claude Code Instructions

## What This Project Is
A Next.js/TypeScript classroom game application for Indonesian high school English teachers. Teachers run AI-powered games on a projector while students participate via their phones (QR code login). Deployed at class-engine.vercel.app.

## Two Modes — Always Respect This
- **Projector/Teacher Mode** — displayed on classroom screen, teacher-facing
- **Phone/Student Mode** — mobile UI served to students via QR code connection

## Design System — Never Change These

### Fonts
- Teacher UI: `Syne` (display) + `JetBrains Mono` (labels/code)
- Student Phone UI: `Nunito` (bold, friendly, readable)

### Color Tokens
```css
--bg: #07090f;
--surface: #0e1420;
--surface2: #131b2b;
--border: #1c2a40;
--border2: #243347;
--text: #dce8f5;
--muted: #4a637d;
--green: #00e87a;
--cyan: #00c8f0;
--orange: #ff7d3b;
--purple: #b06eff;
--yellow: #ffc843;
--pink: #ff4d8f;
--red: #ff4444;
--t1: #00e87a; --t2: #00c8f0; --t3: #ffc843; --t4: #ff4d8f;
--t5: #b06eff; --t6: #ff7d3b; --t7: #e2e8f0;
```

### Team Colors — Fixed, Never Change
T1=green · T2=cyan · T3=yellow · T4=pink · T5=purple · T6=orange · T7=white

## Architecture Rules — Do Not Break
1. Preserve ALL existing game logic and multiplayer functionality
2. Preserve ALL existing AI integrations and API routes
3. Only change UI/UX unless explicitly instructed otherwise
4. Student phone screens must NEVER show a blank/dead screen — lobby is always the fallback state
5. Analytics is class-level (not student-level) — class journal and standings are primary
6. Universal scoreboard component must appear at bottom of ALL game projector views
7. Teams support 2–7 players — always use dropdown, never fixed buttons

## Pages & Their Accent Colors
- `/arcade` — orange (#ff7d3b) — game selection hub
- `/teams` — cyan (#00c8f0) — roster + team builder + live session
- `/analytics` — purple (#b06eff) — class performance dashboard

## Games
| Game | Skill | Energy | Phone |
|------|-------|--------|-------|
| Fix It | Vocabulary | Mid | Text input |
| Odd One Out | Vocabulary | Mid | 4-button grid |
| Chain Reaction | Vocabulary | High | None |
| Picture Reveal | Reading | High | Buzz button |
| Jeopardy | Reading | Mid | Buzz button |
| Story Chain | Writing | Low | None |
| Would You Rather | Writing | Mid | 2-button vote |
| Rapid Fire | Speaking | High | 4-button grid |
| The Hot Seat | Speaking | High | None |

## Student Phone — 4 States (Always in This Order)
1. **Connect** — name dropdown from class roster → join button
2. **Lobby** — personal stats + team standings + waiting indicator
3. **In-Game** — game-specific UI (text input / button grid / buzz)
4. **Post-Submit** — AI feedback + score update + streak + waiting for class

## AI Feedback Rules (Post-Submit)
- Correct: explain WHY it was right, name the grammar concept
- Wrong: hint at the TYPE of error without revealing the answer
- Always encouraging, max 2 sentences
- Never just "correct" or "wrong" — always specific

## Full Design Reference
See `/design/ARCADE_COMMAND_Technical_Brief.md` for complete specifications including component details, data models, game specs, and HTML mockups.

## When Starting a New Session
1. Read this file
2. Read `/design/ARCADE_COMMAND_Technical_Brief.md`
3. Explore the existing codebase to understand current structure
4. Confirm understanding before making changes
5. Work one phase at a time — confirm after each phase before proceeding
