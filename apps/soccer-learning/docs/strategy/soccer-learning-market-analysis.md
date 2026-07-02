# soccer-learning — Market Analysis

Prepared by: CSO (synthesis of market-researcher + competitive-analyst deliverables)
Date: 2026-07-02
Verdict: **BUILD (Japan-first, web/PWA, freemium)** — with disciplined scope and a 2026 World Cup launch window.

Confidence legend: **[H]** high · **[M]** medium · **[L]** low / directional estimate.

---

## 1. Executive Summary

The soccer-learning app sits at the intersection of two high-growth markets — global **sports-coaching platforms (CAGR ~24.5%)** and **Japan online education (CAGR 16–26%)** — with soccer being the largest segment of sports training. The core opportunity is a clear **whitespace**: existing learning is either fragmented across unstructured YouTube, confined to isolated drill libraries (Techne, box-to-box) or form-analyzers (AIスポーツトレーナー), or locked behind hardware (DribbleUp). **No incumbent offers a Japanese-native, level-structured (beginner→semi-pro) curriculum that integrates skills + tactics + positioning + physical + mental into one progression path.**

Recommendation: **BUILD**, Japan-first, web/PWA, freemium. Lead with structured curriculum + gamification (streaks/XP) + parent-facing progress visualization. Defer AI motion analysis to Phase 2. Time the MVP + ASO to the **June 2026 FIFA World Cup** demand spike (+131–204% install lift observed in 2022).

Primary risks: content-production weight for a solo dev, low willingness-to-pay anchored by free YouTube, and the possibility of JFA or a funded incumbent formalizing a Japanese curriculum.

---

## 2. Market Sizing

| Market | Size (recent) | Forecast | CAGR | Source |
|---|---|---|---|---|
| Global sports app | USD 4.77–5.32B (2024–25) | 12.9–13.2B (2034) | 10.6–11.1% | Precedence / Market.us / Polaris |
| Global sports-coaching platforms | USD 466.3M (2024) | 3,351.7M (2033) | **24.5%** | Business Research Insights |
| — of which mobile-app segment | USD 622.7M (2024) | — | — | same |
| Global sports training (incl. services) | USD 27.8B (2023) | 50.7B (2035) | 5.2% | Allied Market Research |
| Global AI-in-sports | USD 1.03B (2024) | 2.61B (2030) | ~17% | WSC Sports / Barça Innovation Hub |
| Japan EdTech | USD 7.7B (2025) | 34.6B (2035) | 16.2% | Market Research Future |
| Japan online education | USD 3.6B (2025) | 29.3B (2034) | 26.1% | IMARC |

**Read:** The direct parent markets (sports-coaching platforms + Japan online education) are both compounding at high double digits, and soccer is the largest sports-training segment — a structural tailwind. **[H for market figures]**

### TAM / SAM / SOM (all estimates — assumptions flagged, low–medium confidence)

**Japan-first (years 1–3):**
- **TAM:** JFA-registered elementary–high school players ~638K + unregistered school/rec/futsal learners → conservatively ~**1.5M** willing-to-pay-for-self-practice population. At ¥6,000/yr (≈¥500/mo) → **TAM ≈ ¥9.0B/yr (~$60M)**. [M]
- **SAM:** ~30% who would actually consider paying for a training app ≈ 450K → **SAM ≈ ¥2.7B/yr (~$18M)**. [M]
- **SOM (solo dev, 3 yrs):** 3–7% of SAM = **14K–32K paying users**; at ¥6,000/yr → **¥84M–¥190M/yr revenue** (freemium; free MAU 5–10× larger). [L–M]

**Global upside (year 4+):** FIFA ~265M players; even 1% at $40/yr → theoretical TAM > **$100M/yr**. Simple extrapolation is unsafe (country-level ability-to-pay + competitive density) — requires i18n + local club partnerships. [L]

---

## 3. Demand Signals (Quantitative)

**Player base (Japan, JFA-registered 2024):** total ~**838,657**; elementary **274,774** / junior-high **212,846** / high school **150,750**. Core buyer target (parents pay) = elementary + junior-high ≈ **488K**. Registered players are the tip of the iceberg; total play population (school clubs, スポ少, schools, rec, futsal) is in the millions (exact public figure not obtained — [L]).

**Global (FIFA Big Count):** ~265M players (2006 baseline, conservative), Asia largest at ~85M.

**Device access (Japan youth, 2024, こども家庭庁):** junior-high smartphone ownership **89.1%**, grade 5–6 **66.7%**; internet use 97–99% across school ages. Target-segment device access is effectively saturated.

**Event-driven demand:** 2022 World Cup drove sports-app installs **+131–204%** vs baseline (Segwise). **June 2026 World Cup is the single largest acquisition window** — align MVP + ASO to it. J-League season (Feb–Dec) and winter off-season are secondary peaks.

---

## 4. Willingness-to-Pay Anchors

**Japan real spend (kids soccer):** private soccer-school fees **¥6,000–13,000/mo** (major chains ¥8,000–12,000); スポ少 (volunteer-coached) **¥2,000–5,000/mo**; school-only annual total **¥100K–150K**.
→ A **¥500–1,500/mo app positioned as a complementary self-practice tool carries an extremely low psychological barrier** against existing ¥6,000–12,000/mo lesson spend.

**Global price anchors:** Anytime Soccer Training ~$4.98/mo; Techne Futbol $9.99–37.99/mo ($279.99/yr); box-to-box ~$100/yr; DribbleUp ~$17–20/mo + $100 smart ball. The $10–38/mo tier reads as "premium/expensive" in user reviews — leaving a freemium/low-price gap.

---

## 5. Competitive Landscape

| Feature | soccer-learning (proposed) | DribbleUp | Techne Futbol | box-to-box | AIスポーツトレーナー (JP) | JFA Passport (JP) | YouTube (AllAttack/JP) |
|---|---|---|---|---|---|---|---|
| Structured levels beginner→semi-pro | ● core diff (planned) | ◐ workout levels | ◐ tiered drills | ◐ personalized plan | ◐ score/rank, not curriculum | ○ | ○ unstructured |
| Tactics & positioning coverage | ● (planned) | ○ | ○ | ○ | ○ (form only) | ◐ some videos | ◐ scattered |
| Skills (dribble/pass/juggle) | ● | ● | ● | ● | ● | ◐ | ● |
| Physical + mental modules | ● (planned) | ◐ | ● (pros/psychologists) | ◐ physical only | ○ | ◐ | ◐ |
| AI form / motion feedback | ◐ Phase 2 | ● (ball track, glitchy) | ○ | ○ | ● (form scoring) | ○ | ○ |
| Personalization | ● curriculum path (planned) | ◐ | ◐ | ● stats-based | ● AI, position | ○ | ○ |
| Gamification / streaks | ● (planned) | ● | ● | ● | ◐ rank/score | ◐ quizzes | ○ |
| Japanese localization (native) | ● first-class | ○ | ○ | ◐ available | ● native | ● native | ◐ JP channels |
| Hardware required | ✗ none | ✔ smart ball | ✗ | ✗ | ✗ | ✗ | ✗ |
| Platform | Web (+PWA) | iOS/Android | iOS/Android | iOS/Android | iOS (+web LP) | iOS/Android | Web/app |
| Price | TBD (freemium) | ~$17–20/mo + ball | $9.99–37.99/mo | free + ~$100/yr | free + IAP | Free | Free |

● strong/native · ◐ partial · ○ absent.

**Key competitor notes:**
- **Techne Futbol [H]** — category leader for app-based individual training; pro-designed drills incl. mental training; 100K+ downloads, 4.8/5 iOS. Weakness: "expensive, little tier differentiation"; no AI; English-only.
- **DribbleUp [H]** — smart-ball + camera tracking; ~320K app downloads but slowing (~96/day). Weakness: hardware friction + glitchy, lighting-dependent tracking; no JP localization.
- **box-to-box [H]** — 200+ drills, stats-based personalization, Borussia Dortmund DLC, seat-based B2B "Pro" for clubs. Validates the grassroots-club channel.
- **AIスポーツトレーナー / MEALIER (JP) [M]** — the closest Japanese direct competitor: native AI form-scoring (5 axes), position-specific menus, and an SEO content blog. But it is form-analysis of isolated skills, **not a structured tactics/positioning/mental curriculum**. This is who we compete with on Japanese SEO.
- **JFA Passport [H]** — official, free, trusted, but institutional content, not a self-improvement curriculum. Potential partner or threat if JFA formalizes e-learning.
- **YouTube [H]** — the real substitute: free, huge, high-production, but unstructured, no progression, no personalization, no accountability — precisely the gap a curriculum fills.

---

## 6. SWOT — soccer-learning

| Strengths | Weaknesses |
|---|---|
| Japan-first native curriculum (incumbents English-only except JP niche). | Solo dev: content/video library production is heavy vs VC-backed rivals. |
| No hardware → zero purchase friction, instant web/PWA access. | Web-first (no native app) hurts App Store discovery, push, offline, camera-AI. |
| Structured beginner→semi-pro path integrating skills + tactics + positioning + mental — whitespace none own. | No brand/authority/pro credibility at launch. |
| Lean stack (Next.js/Supabase/Vercel) → low burn, fast iteration. | AI form analysis hard on web; AIスポーツトレーナー already holds that JP niche. |
| Can undercut $10–38/mo incumbents with freemium. | WTP suppressed by free YouTube; JP youth-sports buyers price-sensitive. |

| Opportunities | Threats |
|---|---|
| No dominant JP structured-curriculum app; fragmented tools + unstructured video leave a clear gap. | JFA formalizing an e-learning curriculum would carry unmatched authority. |
| Tactics/positioning/game-IQ under-served globally, not just skills. | Techne/box-to-box localizing to Japanese would erase the language moat. |
| B2B: sell to grassroots clubs, schools, 少年団 (seat-based). | Free YouTube + DAZN compete for the same household wallet. |
| Japanese-SEO content moat (AIスポーツトレーナー proves the funnel works). | Commoditizing CV/AI could let a funded player ship superior AI feedback fast. |
| June 2026 World Cup install spike (+131–204%). | Platform risk if a native app becomes necessary (App Store gatekeeping). |

---

## 7. Recommended Differentiation Angles

1. **Japanese-native, level-structured curriculum (beginner→semi-pro) as one integrated path.** No competitor offers an ordered syllabus that takes a Japanese learner from beginner to semi-pro. This is the strongest, most defensible wedge — turn fragmented YouTube/knowledge into a guided progression with assessment and completion tracking. [H]

2. **Tactics, positioning & game intelligence (戦術理解) — not just individual skill drills.** Nearly every rival fixates on dribble/pass/juggle mechanics; tactical understanding and positioning are confined to coach-facing tactic-board tools or scattered video. A learner-facing tactics + mental curriculum is near-empty space and answers the "I don't know what/in-what-order to practice" pain. [H]

3. **No-hardware, web/PWA, freemium priced as a complement to existing lessons.** Undercut the $10–38/mo "premium" incumbents with a generous free curriculum tier + affordable premium (¥500–1,500/mo). This exploits DribbleUp's hardware friction and reads as trivially cheap against ¥6,000–12,000/mo school fees. [M]

4. **B2B2C grassroots channel (少年団 / schools / clubs, seat-based).** box-to-box Pro validates club seat sales; no strong Japanese-native equivalent exists. This delivers durable LTV that sidesteps consumer churn and gives coaches a top-down adoption path alongside bottom-up player sign-ups. [L–M]

5. **Japanese-SEO content engine + World Cup timing.** Build a Japanese content/SEO moat (the exact funnel AIスポーツトレーナー is running) and align MVP + ASO to the June 2026 World Cup spike to capture the +131–204% install lift at the lowest CAC. [M]

---

## 8. Go-to-Market (initial)

- **Phase 1 (pre-June 2026):** Ship MVP curriculum (skills + tactics for beginner→intermediate) + streaks/XP + parent progress view. Launch Japanese SEO content. Freemium: free curriculum core, paid premium for advanced tiers/personalization.
- **Phase 2 (post-launch):** Add advanced/semi-pro tiers, mental modules, and pilot AI form-analysis (only after retention is proven). Begin 少年団/club seat-based B2B pilots.
- **Phase 3 (year 2+):** i18n + local club partnerships for global expansion.

---

## 9. Risks & Open Questions (recommend next-cycle validation)

- Content-production throughput for a solo dev is the #1 execution risk — scope the initial curriculum tightly.
- Obtain real download/revenue data (Sensor Tower / App Store) for Techne, DribbleUp, AIスポーツトレーナー — public quantitative traction was thin.
- Validate unmet needs via primary user interviews (Reddit r/bootroom, JP parent communities) — current pain points are inferred from review patterns.
- TAM/SAM/SOM conversion rates and ARPU are assumptions — align pricing with pricing-strategist / CFO.
- Confirm Techne's upper price tier ($37.99/mo) is annual/club, not standard monthly — several JP/US source pages returned HTTP 403 and need re-verification before investor-facing use.

---

## Sources

Market: Precedence Research (Sport App Market); Market.us (Sports App Market); Polaris (Sports App Market); Business Research Insights (Sports Coaching Platforms Market); Allied Market Research (Sports Training Market); WSC Sports (AI Coaching); Barça Innovation Hub (AI & Computer Vision in Football); Market Research Future (Japan EdTech); IMARC (Japan Online Education); JFA データボックス (player registrations); Statista (Japan registered soccer players 2024); FIFA Big Count 2006; コドモブースター / スポスルマガジン / Yahoo!スポーツナビ (soccer school fees); 文科省 子供の学習費調査; こども家庭庁 青少年インターネット利用環境実態調査 2024; Segwise (World Cup 2026 app trends).

Competitors: DribbleUp (site, App Store, Google Play, Justuseapp reviews); Techne Futbol (pricing, App Store, Google Play, AppGrooves); box-to-box (pricing, FAQ, App Store); AIスポーツトレーナー / MEALIER (soccer, app comparison blog, App Store JP); JFA PLAYERS FIRST / JFA Passport; DAZN / J-League (Japan Times, SportBusiness); YouTube (AllAttack, Unisport, サッカーキング, サッカー家庭教師, golazo curated lists); Sports Vision AI / Width.ai (CV ball tracking); cybernews / a-champs / Poteau (best soccer training apps 2025–26).

Note: several Japanese source pages returned HTTP 403 on direct fetch; affected figures are drawn from search-result summaries and should be re-verified before investor-facing use.
