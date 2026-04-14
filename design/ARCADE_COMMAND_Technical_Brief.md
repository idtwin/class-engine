# ARCADE_COMMAND — Claude Code Technical Brief
## Complete Design & Implementation Specification
**Project:** class-engine (github.com/idtwin/class-engine)  
**Stack:** Next.js · TypeScript · Deployed on Vercel (class-engine.vercel.app)  
**Prepared for:** Claude Code implementation  
**Date:** April 2026

---

## 1. PROJECT OVERVIEW

ARCADE_COMMAND is a teacher-facing web application for running AI-powered English conversation games in Indonesian high school classrooms (SMA, grades 10-12, A1-B1 English level). It operates in two modes:

- **Projector Mode** — teacher-facing, displayed on classroom projector
- **Phone Mode** — students connect via QR code on their personal phones

The app manages multiple classes (e.g. XI-I, XI-II, XI-III), each with a roster of ~17-19 students, divided into 2-7 teams per session.

---

## 2. DESIGN SYSTEM

### 2.1 Color Tokens
Apply these CSS custom properties globally across all components:

```css
:root {
  /* Base */
  --bg: #07090f;
  --surface: #0e1420;
  --surface2: #131b2b;
  --border: #1c2a40;
  --border2: #243347;

  /* Text */
  --text: #dce8f5;
  --muted: #4a637d;

  /* Accent */
  --green: #00e87a;
  --cyan: #00c8f0;
  --orange: #ff7d3b;
  --purple: #b06eff;
  --yellow: #ffc843;
  --pink: #ff4d8f;
  --red: #ff4444;

  /* Team Colors */
  --t1: #00e87a;
  --t2: #00c8f0;
  --t3: #ffc843;
  --t4: #ff4d8f;
  --t5: #b06eff;
  --t6: #ff7d3b;
  --t7: #e2e8f0;
}
```

### 2.2 Typography
- **Display/UI font:** `Syne` (weights: 400, 500, 600, 700, 800) — used for all teacher-facing UI
- **Monospace/labels:** `JetBrains Mono` (weights: 400, 700) — used for tags, stats, codes, labels
- **Student phone font:** `Nunito` (weights: 400, 600, 700, 800, 900) — used for all student-facing phone UI

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
```

### 2.3 Background Texture
Apply this subtle grid to all teacher-facing page backgrounds:

```css
.page-bg::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,232,122,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,232,122,0.015) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}
```

### 2.4 Navigation Bar
Sticky, 52px height, backdrop blur. Three nav links: Arcade, Teams & Roster, Analytics.

```
[⊞ ARCADE_COMMAND]    [ARCADE] [TEAMS & ROSTER] [ANALYTICS]    [● SOUND: ON]
```

- Active link: white text + 1.5px bottom border in section accent color
- Brand: JetBrains Mono, green (#00e87a)
- Links: JetBrains Mono, 11px, uppercase, letter-spacing 0.12em

### 2.5 Design North Star
**Teacher UI:** Dark terminal aesthetic — refined, information-dense, professional  
**Student Phone UI:** Mobile Legends × Duolingo — high contrast, bold tap targets, satisfying feedback moments, energetic without being chaotic

---

## 3. PAGE SPECIFICATIONS

### 3.1 ARCADE PAGE (`/arcade`)
**Purpose:** Game selection hub  
**Accent color:** `--orange`

#### Layout Structure:
1. Page header with breadcrumb `SYSTEM_READY // SELECT_MODULE`
2. Featured game card (last played, class-specific)
3. Filter bar (All / Vocabulary / Reading / Writing / Speaking / 📱 Phone Active)
4. Game categories (grouped by skill focus)

#### Featured Card:
- Shows last game played for the currently selected class
- Class selector chips at top: All Classes / XI-I / XI-II / XI-III
- Displays: game name, icon, description, when last played, which class
- Session stats: Score, Accuracy (colour-coded bar), vs Last Session delta
- Accuracy colour coding: ≥70% = green, ≥50% = yellow, <50% = pink
- "Different game" button to browse alternatives
- Launch button (circular, 120×120px)

#### Game Categories:
Games are grouped by skill focus with colour-coded category headers:

| Category | Color | Games |
|----------|-------|-------|
| Vocabulary | `--purple` | Fix It, Odd One Out, Chain Reaction |
| Reading | `--cyan` | Picture Reveal, Jeopardy |
| Writing | `--green` | Story Chain, Would You Rather |
| Speaking | `--pink` | Rapid Fire, The Hot Seat |

#### Game Card Data Model:
Each game card shows:
- Game name + icon
- Short description
- Energy level tag: 🔥 High / ⚡ Mid / 💧 Low
- Phone support tag: 📱 Phone Active / No Phone
- Skill category tag
- "Init →" label on hover

#### All Games:
```typescript
const games = [
  { name: "Fix It",          icon: "🟡", skill: "vocabulary", energy: "mid",  phone: true,  desc: "Find the single error in a broken sentence before other teams. Race, Auction, and Spot & Swap modes." },
  { name: "Odd One Out",     icon: "🔮", skill: "vocabulary", energy: "mid",  phone: true,  desc: "AI-powered word classification. Classic, Debate, and Elimination modes. Find the outlier!" },
  { name: "Chain Reaction",  icon: "🔗", skill: "vocabulary", energy: "high", phone: false, desc: "Compound word chains or last-letter races. Letter hints reveal on wrong answers." },
  { name: "Picture Reveal",  icon: "🖼️", skill: "reading",    energy: "high", phone: true,  desc: "Answer rapid-fire questions to reveal a hidden AI-generated image tile by tile." },
  { name: "Jeopardy",        icon: "⊞",  skill: "reading",    energy: "mid",  phone: true,  desc: "The classic 5×5 board. AI dynamically generates categories and high-context visual aids." },
  { name: "Story Chain",     icon: "📖", skill: "writing",    energy: "low",  phone: false, desc: "Improv rules! Chain the story blocks using AI-forced keywords before the timer ends." },
  { name: "Would You Rather",icon: "💬", skill: "writing",    energy: "mid",  phone: true,  desc: "AI split-screen debate generator forcing students to argue bizarre scenarios." },
  { name: "Rapid Fire",      icon: "⚡", skill: "speaking",   energy: "high", phone: true,  desc: "Fast-paced buzzer game. AI pre-generates 15–20 questions routed by student level." },
  { name: "The Hot Seat",    icon: "🔥", skill: "speaking",   energy: "high", phone: false, desc: "Fast-paced Taboo. Describe the hidden word to the student facing away from the projector." },
]
```

---

### 3.2 TEAMS & ROSTER PAGE (`/teams`)
**Purpose:** Student roster management + team generation + live session scoring  
**Accent color:** `--cyan`

#### Three-State Flow:
The page has three distinct states navigated via a stepper component:

```
[✓ Roster Setup] ——— [2 Team Builder] ——— [3 Live Session]
```

Stepper states: `done` (green ✓) / `active` (cyan number) / `pending` (grey number)

---

#### State 1: Roster Setup
- Search input to filter students
- Class snapshot stats: High Fluency count, Mid Fluency count, Low Fluency count, Active Energy count, High Confidence count
- Student grid (3 columns)
- "→ Generate Teams" button proceeds to State 2

**Student Card Data Model:**
```typescript
interface Student {
  name: string;
  fluency: 'low' | 'mid' | 'high';
  energy: 'passive' | 'normal' | 'active';
  confidence: 'low' | 'mid' | 'high';
}
```

**Tag colour mapping:**
```
Fluency:    low=#ff8080  mid=--yellow  high=--green
Energy:     passive=--muted  normal=--cyan  active=--orange
Confidence: low=#ff8080  mid=--yellow  high=--purple
```

---

#### State 2: Team Builder
- Team count dropdown: 2–7 teams
- "Re-generate" button
- Team colors: T1=--t1 T2=--t2 T3=--t3 T4=--t4 T5=--t5 T6=--t6 T7=--t7

**Team Generation Algorithm (Snake Draft):**
```typescript
function generateTeams(students: Student[], numTeams: number): Student[][] {
  const scored = [...students].sort((a, b) => 
    (score(b) - score(a))
  );
  const teams: Student[][] = Array.from({ length: numTeams }, () => []);
  let dir = 1, idx = 0;
  scored.forEach(student => {
    teams[idx].push(student);
    idx += dir;
    if (idx >= numTeams) { idx = numTeams - 1; dir = -1; }
    else if (idx < 0) { idx = 0; dir = 1; }
  });
  return teams;
}

function score(s: Student): number {
  const fl = { low: 1, mid: 2, high: 3 };
  const en = { passive: 1, normal: 2, active: 3 };
  const co = { low: 1, mid: 2, high: 3 };
  return fl[s.fluency] + en[s.energy] + co[s.confidence];
}
```

**Balance Summary Cards:**
Show per-team average for Fluency, Energy, Confidence as percentage bars. This makes the AI balancing logic *visible* to the teacher.

**Member rows** show:
- Student name
- Three coloured dots (fluency / energy / confidence colours)
- "Move" button for manual adjustment

---

#### State 3: Live Session
- Score cards per team (1–7 teams) showing: team name, rank (👑 for 1st), score, % of total, lead gap
- **Dominant alert:** if gap between 1st and last > 800pts → yellow warning "Team X is leading by N pts — consider a catch-up round." If gap ≤ 800 → green "Scores are tight."
- **Gap bar:** horizontal bar divided by team share of total score, each segment in team colour
- **Session History table:** columns = Game / T1 / T2 / T3 / T4 / Winner — one row per game played this session
- **Manual Score Adjust:** per-team −/+ 100 buttons + free-entry input field

---

### 3.3 ANALYTICS PAGE (`/analytics`)
**Purpose:** Class performance tracking and insights  
**Accent color:** `--purple`

#### Layout (top to bottom):

**1. Page Controls**
- Time range selector: This Week / This Month / This Semester / All Time (default: This Month)
- Export button
- "⚡ AI Report" button

**2. Overview Strip (4 cards)**
- Sessions Played (--cyan)
- Avg Accuracy (--green)
- Top Game (--yellow)
- Most Active Class (--purple)

**3. AI Monthly Summary Card**
- Purple-accented card with ⚡ icon
- Written paragraph generated by AI covering: sessions count, strongest class, most effective game, classes needing attention, unused games
- Highlight classes: positive=--green, attention=--yellow, game=--purple

**4. Class Overview Cards (grid)**
One card per class showing:
- Class name + student count
- Trend badge: "↑ Improving" (green) / "⚠ Needs Attention" (yellow) / "🏆 Top Class" (purple)
- Three stats: Sessions / Accuracy / Energy level
- Sparkline (7 bars showing accuracy trend)
- AI one-line summary in italic

Clicking a class card updates the Deep Dive panel below.

**5. Class Deep Dive Panel**
Two-column layout:
- Left: Bar chart — Accuracy by Game (6 bars, each game a different accent colour, 120px height)
- Right: Game Performance table — columns: Game / Times Played / Accuracy (with mini bar) / Engagement (High/Mid/Low with coloured dot)

**6. Session Journal**
Full-width table, one row per session:
- Columns: Game / Class / Date / Score / Accuracy / vs Last (delta with ↑↓→)
- Colour-coded by class

**7. Class Standings by Game**
Grid of cards, one per game:
- Shows ranking: 1st (gold) / 2nd / 3rd
- Each row: rank + class name + accuracy %

---

## 4. STUDENT PHONE UI

### 4.1 Design Principles
- Font: Nunito (bold, friendly, readable)
- Dark background (#0a0e1a) — works in bright classrooms
- Large tap targets (minimum 48px height for buttons)
- Immediate visual feedback on every interaction
- Team colour strip at top of every in-game screen
- Minimal text per screen — students are reading English, clarity is critical

### 4.2 State 1: Connect Screen
```
[● ARCADE_COMMAND]
🎮
"Ready to Play?"
"Select your name to join"

[Your Name dropdown — populated from active class roster]
[Join Class → button — cyan, full width]

[● XI – I · SMA · 17 Students]
```

- Dropdown populated from teacher's currently active class
- On submit → navigate to Lobby screen
- Radial gradient: rgba(0,200,240,0.08) from top

### 4.3 State 2: Lobby Screen
Persistent between games. Shows:

**Personal Banner (team-coloured):**
```
Welcome back,
[Student Name] 👋
[● TEAM 2]
```

**Personal Stats row (3 cards):**
- 🔥 Streak count
- Personal Score (green)
- Accuracy % (purple)

**Team Standings list:**
- All teams with coloured dots + scores
- Student's team highlighted with "← YOU" marker in cyan

**Waiting indicator:**
- Animated three dots + "Waiting for teacher to start..."
- Auto-transitions when teacher launches a game

### 4.4 State 3: In-Game Screens

#### Fix It (Text Input):
```
[FIX IT badge] [0:24 timer]
─────────────────────────
"Find & fix the error"

[Sentence with error underlined in red/wavy]
💡 Hint: [grammar hint]

[Textarea — "Type the corrected sentence..."]
[Submit Answer ✓ — cyan gradient button, full width]
```

- Error highlighted: background rgba(255,68,68,0.15), color #ff8080, text-decoration underline wavy #ff4444
- Submit button: gradient(135deg, --cyan, #0090ff), box-shadow 0 8px 28px rgba(0,200,240,0.35)

#### Odd One Out / Rapid Fire / Would You Rather (Button Grid):
```
[Game badge] [timer]
─────────────────
[Question text — centered, bold]

[Option A] [Option B]
[Option C] [Option D]

[Submit ✓ button]
```

- 2×2 grid of option buttons
- Unselected: surface2 background, border var(--border)
- Selected: border --green, background rgba(0,232,122,0.12), color --green
- On select: scale(1.02) transform
- Submit button colour matches game accent

#### Would You Rather:
- Same 2×2 grid but only 2 options (A / B), larger buttons
- Red option + Blue option visual split

#### Jeopardy / Picture Reveal (Buzz):
```
[Game badge] [timer]
─────────────────────
"Know the answer?"

[Large circular BUZZ button — 180×180px]
  - Radial gradient orange/red
  - Pulsing box-shadow animation
  - Active state: scale(0.93)

[Team name · Team score]
```

### 4.5 State 4: Post-Submit Feedback

#### Correct State:
```
[✓ icon — green circle, pop-in animation]
"Correct!"

[⚡ AI FEEDBACK card]
"[Grammar-specific explanation of why answer was correct]"

[+100 pts] [440 My Total]

[🔥 5 in a row!]

[··· Waiting for class...]
```

#### Wrong State:
```
[✗ icon — red circle, pop-in animation]
"Not Quite"

[⚡ AI FEEDBACK card — orange accent]
"[Specific grammar hint without giving answer away]"

[+0 pts] [340 My Total]

[💔 Streak lost]

[··· Waiting for class...]
```

**AI Feedback Rules:**
- Correct: explain *why* it was right, name the grammar concept
- Wrong: hint at the *type* of error without revealing the answer
- Always encouraging tone, max 2 sentences
- For Fix It: reference specific grammar concept (verb agreement, article usage, tense, etc.)
- For Odd One Out: explain why the word doesn't belong semantically

**Score logic:**
- Correct answer: +100 points base
- Streak bonus: streak × 10 additional points (streak of 3 = +130 total)
- Wrong answer: +0 points, streak resets

---

## 5. GAME SPECIFICATIONS

### 5.1 Universal Game Architecture

Every game has three views:
1. **Teacher/Projector View** — full screen, displayed on classroom projector
2. **Student Phone View** — mobile-optimised, served to connected students
3. **Teacher HUD** — subtle overlay on projector showing live stats (score, accuracy)

**Universal Scoreboard (bottom of all projector views):**
```
[T1 icon] [T2 icon] [T3 icon] [T4 icon]
1,900     650       1,400     200
TEAM 1    TEAM 2    TEAM 3    TEAM 4
```
- Full width, fixed to bottom
- Each team has unique icon + colour from team color tokens
- Scores update in real-time
- Height: ~90px

### 5.2 Game: Fix It
**Skill:** Vocabulary/Grammar  
**Energy:** Mid  
**Phone:** Yes — text input

**Projector View:**
- Large display of the broken sentence (error highlighted)
- Mode indicator (Race / Auction / Spot & Swap)
- Timer
- Team answer submission status
- Universal scoreboard at bottom

**Phone View:** See Section 4.4 Fix It spec above

**AI Generation:**
- Input: difficulty level (Low/Mid/High/Mixed), optional theme
- Output: broken sentence + correct version + grammar concept label + hint
- Error types: subject-verb agreement, article usage, tense, preposition, word order, spelling

**Scoring:**
- First correct answer: +200 points to team
- Subsequent correct: +100 points
- Wrong answer: 0 points, no penalty

---

### 5.3 Game: Odd One Out
**Skill:** Vocabulary  
**Energy:** Mid  
**Phone:** Yes — button selection (4 options)

**Projector View:**
- 4 words displayed prominently
- Category hint (optional)
- Timer
- Student selection progress (X/17 students answered)

**Phone View:** See Section 4.4 Button Grid spec

**AI Generation:**
- Input: vocabulary category, difficulty
- Output: 3 related words + 1 outlier + explanation of why outlier doesn't fit

**Scoring:**
- Correct selection: +100 points personal, contributes to team total
- Team score = sum of correct individual answers

---

### 5.4 Game: Rapid Fire
**Skill:** Speaking/Vocabulary  
**Energy:** High  
**Phone:** Yes — 4-option multiple choice

**Projector View:**
- Current question large and centered
- Answer options A/B/C/D
- Timer (fast — 10-15 seconds per question)
- Question counter (e.g. "Question 7 of 20")

**AI Generation:**
- Pre-generates 15-20 questions before game starts
- Routed by class level (Low/Mid/High)
- Question types: vocabulary, grammar, reading comprehension

---

### 5.5 Game: Jeopardy
**Skill:** Reading  
**Energy:** Mid  
**Phone:** Yes — buzz button only

**Projector View:**
- 5×5 grid: 5 categories × 5 point values (100/200/300/400/500)
- Revealed/unrevealed state per cell
- Selected question displayed full screen
- Universal scoreboard

**Phone View:** Buzz button (see Section 4.4)

**AI Generation:**
- Generates 5 categories + 5 questions per category
- Questions scale in difficulty with point value

---

### 5.6 Game: The Hot Seat
**Skill:** Speaking  
**Energy:** High  
**Phone:** No phone interaction

**Projector View:**
- Hidden word displayed (only facing teacher/class, not student in hot seat)
- Forbidden words list (taboo words)
- Timer

---

### 5.7 Game: Picture Reveal
**Skill:** Reading  
**Energy:** High  
**Phone:** Yes — buzz button only

**Projector View:**
- AI-generated image covered by tile grid
- Tiles removed as correct answers are given
- Questions displayed one at a time

---

### 5.8 Game: Would You Rather
**Skill:** Writing/Speaking  
**Energy:** Mid  
**Phone:** Yes — 2-option vote

**Projector View:**
- Split screen: Option A (left) vs Option B (right)
- Live vote percentage bars updating in real-time
- Student vote count

**Phone View:** Two large buttons (A/B)

**Post-vote:** Show class vote split on both projector and phone

---

### 5.9 Game: Story Chain
**Skill:** Writing  
**Energy:** Low  
**Phone:** No (future: sentence submission)

**Projector View:**
- Current story text building up
- Keyword that must be used in next sentence
- Timer per turn
- Student turn indicator

---

### 5.10 Game: Chain Reaction
**Skill:** Vocabulary  
**Energy:** High  
**Phone:** No

**Projector View:**
- Last letter of previous word highlighted
- Next word must start with that letter
- Timer
- Letter hint on wrong answers

---

## 6. DATA ARCHITECTURE

### 6.1 Core Data Models

```typescript
interface Class {
  id: string;
  name: string; // e.g. "XI - I"
  school: string; // e.g. "SMA"
  students: Student[];
  levelTrend: 'low' | 'mid' | 'high';
  energyTrend: 'passive' | 'normal' | 'active';
}

interface Student {
  id: string;
  name: string;
  fluency: 'low' | 'mid' | 'high';
  energy: 'passive' | 'normal' | 'active';
  confidence: 'low' | 'mid' | 'high';
}

interface Team {
  id: number;
  name: string; // "Team 1", "Team 2", etc.
  color: string; // CSS variable reference
  members: Student[];
  score: number;
}

interface GameSession {
  id: string;
  gameType: GameType;
  classId: string;
  date: Date;
  teams: Team[];
  score: number; // total score
  accuracy: number; // percentage 0-100
  duration: number; // minutes
}

type GameType = 'fix-it' | 'odd-one-out' | 'rapid-fire' | 'jeopardy' | 'hot-seat' | 'picture-reveal' | 'would-you-rather' | 'story-chain' | 'chain-reaction';
```

### 6.2 Analytics Data

```typescript
interface ClassAnalytics {
  classId: string;
  period: 'week' | 'month' | 'semester' | 'all';
  sessionsPlayed: number;
  avgAccuracy: number;
  accuracyTrend: number[]; // 7 data points for sparkline
  trend: 'improving' | 'declining' | 'stable';
  gameBreakdown: GameStat[];
  aiSummary: string;
}

interface GameStat {
  gameType: GameType;
  timesPlayed: number;
  avgAccuracy: number;
  engagement: 'high' | 'mid' | 'low';
}
```

---

## 7. REAL-TIME MULTIPLAYER ARCHITECTURE

### 7.1 Connection Flow
1. Teacher opens game → server creates room with roomCode
2. Students scan QR code → navigate to `/join/[roomCode]`
3. Students select name from class roster dropdown
4. Student joins room → assigned to their team
5. Teacher launches game → all connected phones transition simultaneously
6. Between games → phones return to Lobby screen automatically

### 7.2 Phone States (automatic transitions)
```
connect → lobby → [teacher launches game] → in-game → post-submit → lobby → [next game]
```

The phone should **never show a dead/blank screen**. Every state transition must be handled:
- Teacher launches game → phones transition from lobby to in-game
- Student submits → phone shows post-submit feedback immediately
- Round ends → phones return to lobby automatically
- Teacher switches games → phones transition to new game view

### 7.3 Score Sync
- Student answers correctly on phone → server validates → team score updates on projector scoreboard in real-time
- Teacher manually adjusts score → updates all connected views immediately
- Session ends → scores saved to GameSession record

---

## 8. IMPLEMENTATION PRIORITIES

Implement in this order:

### Phase 1 — Design System & Navigation
- [ ] Apply global CSS tokens (colors, fonts, background texture)
- [ ] Rebuild navigation component with new design
- [ ] Apply Syne font to all teacher-facing components
- [ ] Apply Nunito font to all student phone components

### Phase 2 — Arcade Page
- [ ] Featured game card with class selector + last-played data
- [ ] Skill-based category sections
- [ ] Game card component with energy/phone tags
- [ ] Filter bar functionality

### Phase 3 — Teams & Roster
- [ ] Three-state stepper navigation
- [ ] Roster view with student cards + tag colours
- [ ] Team builder with snake draft algorithm + balance summary
- [ ] 2-7 team dropdown
- [ ] Live session view with gap bar + dominant alert + score history

### Phase 4 — Student Phone UI
- [ ] Connect screen with class roster dropdown
- [ ] Lobby screen with personal stats + team standings
- [ ] Fix It phone view (text input + highlighted error)
- [ ] Button grid phone view (Odd One Out, Rapid Fire, Would You Rather)
- [ ] Buzz button phone view (Jeopardy, Picture Reveal)
- [ ] Post-submit feedback screen (correct + wrong states)
- [ ] AI feedback integration (grammar-specific hints)
- [ ] Automatic state transitions between lobby/game/feedback

### Phase 5 — Analytics
- [ ] Overview stats strip
- [ ] AI monthly summary card
- [ ] Class overview cards with sparklines + trend badges
- [ ] Class deep dive panel (bar chart + game table)
- [ ] Session journal table
- [ ] Class standings by game grid
- [ ] Time range selector (week/month/semester/all)

### Phase 6 — Game Redesigns
Apply new design system to each game's projector view:
- [ ] Fix It — projector view redesign
- [ ] Odd One Out — projector view redesign
- [ ] Rapid Fire — projector view redesign
- [ ] Jeopardy — projector view redesign
- [ ] The Hot Seat — projector view redesign
- [ ] Picture Reveal — projector view redesign
- [ ] Would You Rather — projector view redesign (split screen + live vote bars)
- [ ] Story Chain — projector view redesign
- [ ] Chain Reaction — projector view redesign
- [ ] Universal scoreboard component (used in all games)

---

## 9. REFERENCE MOCKUPS

The following HTML mockup files were produced during the design sessions and contain working reference implementations. Use these as visual truth for implementation:

1. **`arcade_page_redesign.html`** — Full Arcade page with featured card, categories, filter bar
2. **`teams_roster_redesign.html`** — Full Teams & Roster three-state flow
3. **`student_phone_ui.html`** — All four student phone states (Connect, Lobby, In-Game, Post-Submit)
4. **`analytics_dashboard.html`** — Full Analytics page with all sections
5. **`arcade_command_roadmap.html`** — Product roadmap document (reference only)

These files contain the exact CSS, component structure, animations, and interactions to replicate. Extract component patterns directly from these files.

---

## 10. KEY DESIGN DECISIONS (DO NOT CHANGE)

1. **Dark background always** — #07090f base. Never white or light backgrounds on teacher UI.
2. **Team colours are fixed** — T1=green, T2=cyan, T3=yellow, T4=pink, T5=purple, T6=orange, T7=white. Consistent everywhere.
3. **Student phone is different** from teacher UI — warmer, bolder, more energetic. Nunito font, not Syne.
4. **Analytics is class-level, not student-level** — individual tracking is secondary. Class journal and standings are primary.
5. **Featured game = last played for selected class** — not random, not manually chosen.
6. **Balance is visible** — the team builder must show fluency/energy/confidence balance bars, not just names in columns.
7. **No dead screens on student phones** — every state transition handled, lobby is always the fallback.
8. **AI feedback is grammar-specific** — not just "correct" or "wrong". Names the concept, hints without revealing.
9. **Scoreboard is universal** — same component used across all games, fixed to bottom of projector view.
10. **2-7 teams supported** — dropdown selector, not fixed buttons.

---

## 11. PROMPT FOR CLAUDE CODE

Use this prompt when starting your Claude Code session:

```
I have a Next.js/TypeScript classroom game application at github.com/idtwin/class-engine. 

I have a complete design brief in ARCADE_COMMAND_Technical_Brief.md that specifies every page, component, interaction, data model, and implementation detail for a full redesign.

Please:
1. Read the full technical brief first
2. Explore the existing codebase to understand the current architecture
3. Implement the changes in the priority order specified in Section 8
4. Reference the HTML mockup files in the brief for exact visual implementation
5. Preserve all existing game logic and multiplayer functionality — only change UI/UX
6. Do not change the data architecture unless specified in the brief

Start with Phase 1 (Design System) and confirm before moving to each subsequent phase.
```

---

*End of Technical Brief — ARCADE_COMMAND v2.0*  
*Prepared from design sessions, April 2026*
