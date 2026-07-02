# Soccer Learning — Product Requirements Document (DRAFT)

**One-line summary:** A structured, gamified soccer *knowledge & skill* learning app that guides players from beginner to elite across four pillars — Technique, Tactics, Physical, and Mental — using follow-along videos, animated tactical diagrams, and spaced-repetition quizzes.

**Status:** DRAFT for Hiro (CEO) review — MVP scope locked by UX research
**Date:** 2026-07-02
**Owner:** feature-planner (under CPO)
**Stack (default):** Next.js (App Router) · Supabase (Auth/DB/Storage) · Vercel · PWA

> This is a *draft* PRD. Section 7 (Open Questions for Hiro) contains decisions that must be resolved before build starts. The **#1 blocker is content sourcing.**

---

## 1. Overview & Problem Statement

### The problem
Soccer education online is abundant but **unstructured**. A motivated player searching YouTube gets a firehose of disconnected tips with no progression, no way to know what to learn next, no retention mechanism, and no feedback that they are improving. Coaching apps that exist tend to focus on either (a) physical training plans or (b) match/video analysis for teams — very few teach the **integrated knowledge of the game** (why a tactic works, how to read space, mental discipline) in a way that a solo learner can follow and *stick with*.

### The opportunity
Bring the "Duolingo for X" pattern — bite-sized structured lessons, daily habit loops, and visible progress — to soccer, but adapted to soccer's reality: skills are physical and situational, not just recall. We win by combining **structured curriculum** (a level × pillar matrix), **cheap-to-author high-value content** (animated tactics + knowledge quizzes) and a **strong habit/retention loop** — while deliberately avoiding the expensive traps (camera-AI form analysis, 3D sim, in-app community) that would sink a solo developer.

### Product thesis
- Structure and progression are the differentiator vs. YouTube — not production budget.
- Retention comes from habit mechanics (daily goal, streaks, XP, spaced repetition), not from social features.
- The cheapest, most defensible content to author first is **Tactics (2D animated diagrams)** and **Knowledge/Mental (text + quiz)**. Video-heavy Technique/Physical content is added incrementally.

### Non-goals (MVP)
No form-correction AI, no 3D simulation, no in-app UGC/forums/chat, no team/coach management, no live match analysis.

---

## 2. Target Personas (by level band)

The app self-segments users into four bands. Each band drives content depth, tone, and default pillar emphasis.

### Persona A — "Kenta," the Beginner
- **Who:** New/casual player or a returning adult; kids/teens starting out. Little formal coaching.
- **Goals:** Learn the fundamentals (first touch, passing, basic rules, positions), build confidence, not feel lost.
- **Pain points:** Doesn't know what to learn first; YouTube is overwhelming and assumes prior knowledge; gives up quickly.
- **Content depth:** Foundational. Heavy on Knowledge (rules, positions, terms) + simple Technique follow-alongs. Short lessons (3-5 min).
- **Device/context:** Mostly mobile/PWA, at home or bedroom, evenings; short sessions.

### Persona B — "Marco," the Intermediate
- **Who:** Plays regularly (school/club/amateur league), a few years of experience.
- **Goals:** Level up specific weaknesses (weak foot, positioning, reading the game), train more deliberately.
- **Pain points:** Plateaued; knows basics but has gaps; wants targeted improvement, not "beginner" repetition.
- **Content depth:** Intermediate. Balanced across pillars; Tactics (spacing, transitions) and Physical (conditioning) grow in weight. Takes calibration quiz to skip what they know.
- **Device/context:** Mobile primary; sometimes tablet for tactics diagrams. Trains 2-4×/week; uses app before/after sessions.

### Persona C — "Diego," the Advanced
- **Who:** Competitive player (strong club, semi-pro pathway, aspiring).
- **Goals:** Refine high-level tactical understanding, positional nuance, mental resilience, marginal physical gains.
- **Pain points:** Generic content is too shallow; wants depth, specificity, and "why," not motivational fluff.
- **Content depth:** Advanced. Tactics + Mental heavy; nuanced scenarios, decision-making. Calibration quiz expected.
- **Device/context:** Mobile + tablet; disciplined routine; values substance and speed over hand-holding.

### Persona D — "Sofia," the Elite
- **Who:** Semi-pro/pro or elite academy player (or a serious coach studying the game).
- **Goals:** Master-level tactical/mental frameworks, edge-case decision-making, self-study reference.
- **Pain points:** Almost nothing online is deep enough; wants expert-grade material and to not waste time on basics.
- **Content depth:** Elite. Deep Tactics/Mental; reference-quality. Least hand-holding. (See Open Q on whether Elite/coach tier is MVP or fast-follow.)
- **Device/context:** Tablet/desktop for study; mobile for logging; treats app as a knowledge reference + habit tracker.

---

## 3. Content & Learning Model

### 3.1 The four pillars
1. **Technique** — ball skills: first touch, passing, dribbling, shooting, finishing, weak foot.
2. **Tactics** — reading the game: positioning, space, pressing, transitions, formations, roles.
3. **Physical** — conditioning: agility, speed, stamina, mobility, injury prevention.
4. **Mental** — psychology: focus, resilience, decision-making, game intelligence, confidence.

### 3.2 Matrix learning path (LOCKED by UX)
The curriculum is a **matrix**, not a single linear tree.

- **Rows = 4 pillars** (Technique / Tactics / Physical / Mental)
- **Columns = 4 levels** (Beginner → Intermediate → Advanced → Elite)
- Each cell = a **section** of ~5-10 lessons.

**Gating rule (chess.com style, NOT a strict gated tree):**
- **Recommended order**, not enforced order.
- **The first lesson of every section is ALWAYS open** — any user can peek into any section at any time.
- Beyond the first lesson, later lessons in a section unlock as the user progresses through that section (soft recommendation via ordering, not a hard lock across the whole matrix).
- Each **lesson shows a recommended-level badge** (Beginner/Intermediate/Advanced/Elite) so users self-calibrate.
- Each **section shows a progress ring** (% of lessons completed).

> Rationale: rigid single-path gating frustrates experienced players and blocks exploration; open-first-lesson lets users self-navigate while recommendations still provide structure.

### 3.3 Placement approach (LOCKED by UX — Hybrid onboarding)
- User **self-selects one of 4 bands** (Beginner / Intermediate / Advanced / Elite) + picks **category (pillar) interests**.
- **Only users who self-select Intermediate or higher** take a **short 5-question calibration quiz** to fine-tune their starting point. Beginners skip the quiz entirely.
- **Max 3 onboarding screens**; **screen 3 launches the first lesson.**
- A **full placement test is explicitly AVOIDED** (too heavy, high drop-off).

### 3.4 Content format per pillar (LOCKED by UX)

| Pillar | Primary format | Interaction | SRS-wired? | Author cost |
|---|---|---|---|---|
| **Technique** | Live-action follow-along video | Video + on-screen **timer**, one-tap complete | No | High (video = bottleneck) |
| **Physical** | Live-action follow-along video | Video + **timer**, one-tap complete | No | High |
| **Tactics** | **2D pitch animated diagrams** (self-authored SVG) | Play/step animation + short quiz | Quiz items → SRS | **Low** (favored) |
| **Knowledge / Mental** | Text + diagrams + **quiz** | Read + quiz | **Yes** (SRS) | **Low** (favored) |

**Content weighting for MVP:** Because live-action video is the production bottleneck for a solo dev, **MVP content is deliberately weighted toward Tactics + Knowledge/Mental** (cheap to author, high perceived value). Technique/Physical ship with a smaller starter set of videos and expand post-launch.

**Explicitly avoided:** camera-AI form analysis, 3D simulation.

### 3.5 Spaced repetition (SRS)
- **Simplified SM-2** algorithm.
- **Applied to KNOWLEDGE items only** (quiz questions from Tactics quizzes + Knowledge/Mental quizzes). Physical/Technique reps are NOT SRS-scheduled.
- Due items surface as part of the **daily goal** and generate light notifications.

---

## 4. Core Feature List

Every feature tagged **[MVP]** or **[Post-MVP]**. Organized by area. Reflects locked UX decisions.

### Onboarding
- [MVP] 3-screen onboarding flow (max 3 screens).
- [MVP] Self-select level band (Beginner / Intermediate / Advanced / Elite).
- [MVP] Pick pillar/category interests.
- [MVP] 5-question calibration quiz — **only** for users who self-select Intermediate+.
- [MVP] Screen 3 launches the first lesson (immediate value, no dead-end).
- [Post-MVP] Optional re-calibration / "retake placement" from settings.

### Learning Path
- [MVP] Matrix view: 4 pillars × 4 levels.
- [MVP] "First lesson of every section always open" gating (chess.com style, no strict tree).
- [MVP] Recommended-order sequencing within a section.
- [MVP] Recommended-level badge on each lesson.
- [MVP] Per-section progress ring.
- [MVP] "Recommended next" surface based on band + progress.
- [Post-MVP] Adaptive re-ordering based on quiz performance.

### Lessons
- [MVP] Follow-along video player with on-screen timer (Technique/Physical).
- [MVP] 2D animated tactical diagrams (self-authored SVG) with step/play controls (Tactics).
- [MVP] Text + diagram lesson reader (Knowledge/Mental).
- [MVP] One-tap "Mark complete."
- [MVP] Immediate XP reward on completion.
- [Post-MVP] Video bookmarking / speed control refinements, transcripts.
- [Post-MVP] Downloadable/offline lessons.

### Drills + Logging
- [MVP] Drill = a follow-along video/timer activity that satisfies the daily goal.
- [MVP] One-tap completion logging (no external verification).
- [MVP] Drill counts toward heatmap + XP + streak.
- [Post-MVP] Custom drill builder / personal drill library.
- **Explicitly avoided (all phases in scope of this PRD):** drill *verification* (camera/AI). Completion is self-reported.

### Quizzes / SRS
- [MVP] Quizzes attached to Tactics + Knowledge/Mental lessons.
- [MVP] Simplified SM-2 spaced repetition on knowledge items only.
- [MVP] "Review due" items folded into the daily goal.
- [MVP] Quiz results feed XP.
- [Post-MVP] Difficulty tuning / question variants / explanations bank.

### Progress / Home
- [MVP] Home screen shows in one scroll: **streak flame → today's goal ring → GitHub-style heatmap → per-pillar progress bars.**
- [MVP] One-tap completion logging surfaces on home.
- [MVP] GitHub-contribution-style heatmap calendar.
- [MVP] Per-pillar cumulative progress bars.
- [MVP] Personal-best comparison (personal stats only).
- [Post-MVP] Weekly/monthly progress digests, trend charts.

### Gamification / Habit
- [MVP] Daily goal = complete **1 lesson OR 1 drill/day** (plus any due SRS reviews).
- [MVP] Streak counter with **streak-freeze** (limited freezes to protect the streak).
- [MVP] Immediate XP rewards on lesson/drill/quiz completion.
- [MVP] Light notifications: **email and/or PWA push** (daily reminder, review-due nudge).
- [Post-MVP] **Weekly leagues / leaderboards.**
- **Explicitly NOT in MVP:** hearts/lives system (avoided entirely), leagues (post-MVP).

### Community
- [MVP] **ZERO in-app UGC.**
- [MVP] Personal-best comparison (self vs. self).
- [MVP] Shareable achievement/streak images exported to external social (X / Instagram).
- [MVP] Links out to external community (Discord / X) — community is *delegated*, not built.
- **Explicitly avoided:** forums, chat, in-app comments, video UGC.

---

## 5. Key User Stories

### 5.1 Onboarding
**As a Beginner, I want to quickly say "I'm a beginner" and start a lesson immediately, so that I don't get stuck in setup or feel judged by a test.**
- Given a first-time user, When they open the app, Then they see at most 3 onboarding screens.
- Given a user self-selects "Beginner," When they proceed, Then they are NOT shown a calibration quiz.
- Given a user self-selects "Intermediate," "Advanced," or "Elite," When they proceed, Then they take a 5-question calibration quiz that adjusts their starting section.
- Given onboarding screen 3, When the user completes it, Then the first lesson launches automatically.
- Given a user picks pillar interests, When onboarding completes, Then their home "recommended next" reflects those interests.

### 5.2 Core learning loop (daily habit)
**As any user, I want a clear "one thing to do today" and instant reward, so that I build a daily habit.**
- Given a returning user, When they open home, Then the today's-goal ring shows progress toward "1 lesson OR 1 drill" plus any due reviews.
- Given the user completes a lesson or drill, When completion registers, Then XP is awarded immediately and the goal ring updates.
- Given the user completes the daily goal, When the day rolls over, Then the streak count increments.
- Given the user misses a day but holds a streak-freeze, When the day rolls over, Then a freeze is consumed and the streak is preserved.
- Given knowledge items are due, When the user opens the daily goal, Then due SRS reviews are included in the session.

### 5.3 Tactical understanding
**As an Intermediate/Advanced player, I want animated 2D pitch diagrams with a check-for-understanding quiz, so that I actually learn why a tactic works, not just watch.**
- Given a Tactics lesson, When it opens, Then a 2D animated SVG diagram plays with step/play controls.
- Given the user finishes the diagram, When they proceed, Then a short quiz checks understanding.
- Given the user answers quiz questions, When graded, Then correct items enter the SM-2 SRS schedule and XP is awarded.
- Given a lesson, When viewed, Then a recommended-level badge is visible.

### 5.4 Drill logging
**As a player training off-app, I want to log a drill in one tap, so that my real training counts toward my streak and progress.**
- Given a drill activity, When the user taps "complete," Then it logs with no external verification required.
- Given a logged drill, When home refreshes, Then the heatmap cell for today fills, XP is added, and it can satisfy the daily goal.
- Given a follow-along drill, When played, Then an on-screen timer runs for timed drills.

### 5.5 Progress / home
**As a motivated learner, I want to see my streak, today's goal, activity heatmap, and per-pillar progress in one glance, so that I feel my momentum and know where I stand.**
- Given the home screen, When it loads, Then a single scroll shows: streak flame, today's goal ring, GitHub-style heatmap, and per-pillar progress bars — in that order.
- Given completed activity across days, When viewing the heatmap, Then each active day is shaded by activity volume.
- Given progress across pillars, When viewing progress bars, Then each pillar shows cumulative completion.

### 5.6 Sharing (external community)
**As a proud user, I want to export a streak/achievement image to X or Instagram, so that I can share progress without any in-app social feature.**
- Given a milestone (streak length, section completion, badge), When the user taps share, Then a branded image is generated and handed to the OS share sheet (X/Instagram).
- Given the app, When a user wants community, Then links to external Discord/X are provided; no in-app UGC exists.

---

## 6. MVP Scope Proposal

**Guiding principle:** ship a complete *habit loop + structured curriculum* that a single developer can build and, crucially, **author content for**, by weighting toward cheap-to-produce Tactics + Knowledge.

### MVP INCLUDES
- **Auth + profile** (Supabase): level band, pillar interests, calibration result.
- **3-screen hybrid onboarding** with conditional 5-Q calibration (Intermediate+ only); screen 3 → first lesson.
- **Matrix learning path** (4 pillars × 4 levels) with open-first-lesson gating, recommended order, level badges, section progress rings.
- **Lessons in all 3 formats**: follow-along video+timer (Technique/Physical), 2D animated SVG tactics diagrams, text+diagram+quiz (Knowledge/Mental).
- **Content weighted to Tactics + Knowledge/Mental** (video pillars ship a smaller starter set).
- **Drills + one-tap logging** (self-reported, no verification).
- **Quizzes + simplified SM-2 SRS** on knowledge items only.
- **Habit system:** daily goal (1 lesson OR 1 drill), streak + streak-freeze, immediate XP, light email/PWA notifications.
- **Home/progress:** one-scroll layout (streak flame, goal ring, GitHub-style heatmap, per-pillar bars), personal-best comparison.
- **Shareable achievement/streak images** to external social; external Discord/X links.
- **PWA** install + push.

### MVP EXCLUDES (with reasoning)
- **Hearts/lives system** — UX research says avoid; punitive mechanic, hurts a knowledge-learning context.
- **Weekly leagues / leaderboards** — Post-MVP; requires a user base and adds social/ranking complexity.
- **In-app community / forums / chat / UGC** — delegated to external Discord/X; huge moderation + build cost for a solo dev.
- **Camera-AI form analysis & drill verification** — technically heavy, expensive, out of scope entirely for now.
- **3D simulation** — cost-prohibitive; 2D SVG achieves the tactical learning goal.
- **Full placement test** — replaced by lightweight self-select + 5-Q calibration.
- **Strict single-path gated tree** — replaced by open-first-lesson matrix.
- **Coach/team management, live match analysis** — different product; out of scope.

### Solo-dev feasibility notes
- The two hardest-to-author pillars (Technique/Physical video) are intentionally *thin* at launch; the app is still complete because Tactics + Knowledge carry the curriculum and are pure SVG/text/quiz (no filming).
- SRS, streaks, XP, heatmap are well-trodden patterns with predictable effort.
- No community = no moderation, no realtime infra, no trust/safety burden.

---

## 7. Open Questions for Hiro (CEO)

Decisions needed before build. **Content sourcing is the #1 blocker.**

1. **Content sourcing (#1 — BLOCKER).** Who authors the curriculum? Options: (a) Hiro authors solo (slow, controls quality); (b) hire/contract a coach or licensed content; (c) curate/adapt existing frameworks with attribution. Even with Tactics+Knowledge weighting, someone must produce accurate, structured lessons + quizzes. **This gates the entire timeline.** What is the plan and budget?
2. **Market / language.** Assume **JA-first** (Japanese UI + content), English later? Or bilingual from day one? This affects content authoring volume significantly.
3. **Age target.** Kids/teens, adults, or all? Drives tone, COPPA-style considerations, notification/consent design, and video content style.
4. **Monetization.** Confirm **free MVP, built freemium-ready** (paywall hooks in place, nothing charged yet)? Or free forever? What's the eventual model — subscription for advanced/elite tiers?
5. **Drill verification.** Confirm **none** (self-reported only) for MVP — agreed?
6. **Positioning vs. YouTube.** How hard do we lean on "structure + habit vs. random videos" in messaging? Do we embed/curate YouTube or produce 100% original? (Legal + differentiation implications.)
7. **Elite / coach tier priority.** Is the **Elite** band (and a potential coach persona) an MVP requirement, or a fast-follow? Elite content is the most expensive to author well — deferring it de-risks launch.
8. **Notification channel.** Email + PWA push sufficient for MVP, or is native app (App Store/Play) push needed sooner? (Affects PWA-only decision.)

---

## 8. Success Metrics (DRAFT — to confirm)

Candidate metrics to instrument (final targets TBD with Hiro / analytics-specialist):

**Activation**
- **Onboarding completion rate** — % who finish 3 screens AND start first lesson (target: high, e.g. >70%).
- **First-lesson completion** — % of new users who complete lesson 1 in session 1.
- **Calibration take-rate** — of Intermediate+ selectors, % who complete the 5-Q quiz.

**Retention**
- **D1 / D7 / D30 retention** — the core health metric for a habit app.
- **Streak rate** — % of active users holding a streak ≥ 3 / ≥ 7 days.
- **Streak-freeze usage** — signal that the safety net is preventing churn.

**Engagement / learning**
- **Lessons (or drills) per week per active user.**
- **Daily-goal completion rate** — % of active days where the goal ring is filled.
- **SRS review adherence** — % of due knowledge items reviewed on time.
- **Section completion** — average sections completed per user / heatmap density.

**Growth (soft, MVP)**
- **Share rate** — % of milestone events that produce an exported image / external share.

> These are candidates. Prioritize D7 retention + daily-goal completion as the two north-star signals for the habit loop; confirm exact targets before launch.

---

*End of DRAFT. Awaiting Hiro's decisions on Section 7 (content sourcing first) before moving to build planning.*
