<!-- SEED — re-run $impeccable document once there's code to capture the actual tokens and components. -->

---
name: Streak Drop — Vocabulary Learning App
description: A focused English–Vietnamese vocabulary tool where consistent correct answers unlock short-form reward moments without disrupting the learning flow.
---

# Design System: Streak Drop

## 1. Overview

**Creative North Star: "The Study Room That Rewards You"**

This is a lean, focused learning product — not a game, not a dashboard. The base experience is a warm, paper-toned workspace where every surface serves the card in front of the user. Typography is calm and readable. Spacing is generous. Nothing competes with the word being studied.

Reward moments are the single intentional break in that discipline. When a user lands a 5-streak, the study room briefly transforms — a Streak Drop overlay fires with a short audio/visual reward — then closes and returns the user to exactly where they were. The contrast between the calm base and the energetic reward is the product's emotional signature. Without the calm base, the reward loses meaning.

The interface rejects Quizlet's brand-blue saturation and Duolingo's relentless gamification. It takes cues from Anki's focus, Notion's spatial calm, and Linear's typographic clarity — then adds a single, tightly controlled reward escalation layer on top.

**Key Characteristics:**
- Paper-warm neutral base. Ink-dark text. No pure whites, no pure blacks.
- Teal-green carries all correctness and progress signals.
- Amber-orange carries combo build-up and attention states.
- Coral-purple gradient appears only inside the 5-streak Streak Drop overlay.
- Be Vietnam Pro throughout for bilingual EN/VI fidelity.
- Flat by default. Shadows reserved for modal-level overlay only.
- Flashcard, Multiple-choice Quiz, and Written-answer Quiz are three equal core surfaces.
- English→Vietnamese and Vietnamese→English modes are first-class. Mode label is always visible.
- Written-answer mode is not secondary. It receives identical layout quality and design polish.
- Streak Drop overlay is always dismissible, short, and fully functional without audio/video assets.

## 2. Colors: The Two-Mode Palette

The palette has two states: restrained study mode and reward burst mode. Color escalates deliberately — never randomly.

### Primary
- **Study Teal-Green** `[hex TBD — oklch ~55% 0.14 175]`: Correct answer states, streak counter fills, progress bars, active mode highlights. Quiet encouragement, not celebration.

### Secondary
- **Challenge Amber-Orange** `[hex TBD — oklch ~68% 0.18 60]`: 3-streak combo pulse, attention states, streak meter as it fills toward 5. Transition between calm and reward. Never used as a background surface outside reward moments.

### Tertiary
- **Streak Drop Coral-Purple** `[gradient TBD — coral anchor, purple edge glow]`: Used exclusively inside the 5-streak Streak Drop overlay container or border. Forbidden everywhere else in the UI.

### Neutral
- **Warm Paper** `[hex TBD — oklch ~97% 0.008 80]`: Page background. Never pure white.
- **Ink Dark** `[hex TBD — oklch ~18% 0.012 250]`: All body text, headings, labels. Never pure black.
- **Soft Border** `[hex TBD — oklch ~88% 0.006 80]`: Card borders, input strokes, dividers.
- **Muted Text** `[hex TBD — oklch ~55% 0.008 250]`: Secondary labels, hints, placeholder text.

### Named Rules

**The Two-Mode Palette Rule.** Study mode is restrained — teal-green accent on ≤10% of any screen. Reward mode breaks this rule, but only inside Streak Drop overlays. Nothing in between receives the same treatment.

**The Reward Escalation Rule.** Color escalates in exactly three steps: (1) Teal-green for correct — restrained. (2) Amber-orange for 3-streak — energetic but contained. (3) Coral-purple for 5-streak Streak Drop — full burst, overlay only. No other escalation path is permitted.

**The No-Blue Rule.** Quizlet's brand blue is explicitly forbidden. If a proposed accent maps to the blue-indigo hue family (oklch hue 240–280), reject it and shift to teal-green or amber-orange.

## 3. Typography

**Primary Font:** Be Vietnam Pro (Google Fonts, `subset=vietnamese`) — humanist sans designed for Vietnamese diacritical accuracy.
**Secondary Font:** JetBrains Mono or IBM Plex Mono — for streak counters, mode labels, stat readouts, and written-answer input fields.

**Character:** Be Vietnam Pro reads naturally in bilingual EN/VI card content. The mono font gives streak meters and mode badges a precise, technical feel — signaling "score" without feeling arcade-like.

### Hierarchy
- **Display** (700, `clamp(2rem, 5vw, 3rem)`, lh 1.1): Page titles and empty-state headlines. Rare.
- **Headline** (600, `1.5rem`, lh 1.25): Section headings, deck titles, quiz screen headers.
- **Title** (600, `1.125rem`, lh 1.35): The term being studied on flashcard or quiz screen. Always the most prominent element on a learning screen.
- **Body** (400, `1rem`, lh 1.6, max 65ch): Deck descriptions, card examples, notes. Both EN and VI content.
- **Label** (500 mono, `0.75rem`, ls `0.04em`, uppercase): Mode labels (`ENGLISH → VIETNAMESE`), button text, status chips.
- **Mono Stat** (mono 700, `1.125rem`): Streak counter digits, score readouts.

### Named Rules

**The Vietnamese Fidelity Rule.** Be Vietnam Pro must load with `&subset=vietnamese`. Never fall back to a system sans that corrupts diacritics. If the font fails, log a dev warning.

**The Title Isolation Rule.** On flashcard and quiz screens, the term (Title weight) must have at least `2rem` vertical breathing room above and below. No other heading-weight text on the same screen. One thing at a time.

## 4. Elevation

Flat by default. Surfaces sit on the warm paper background without shadows. Depth comes from background-tint contrast and border treatment, not shadow stacking.

The single exception: the Streak Drop overlay receives a modal shadow to mark the context boundary between reward and study surface. The shadow is structural, not decorative.

### Named Rules

**The Flat-By-Default Rule.** If you are adding a shadow to anything other than the Streak Drop overlay or a modal dialog, stop. Use a tinted background or a soft border instead.

## 5. Components

This is a seed DESIGN.md — no components have been built yet. The following documents intended philosophy for the three core learning surfaces and the Streak Drop system.

### Flashcard
One card centered per screen. Front: term (Title weight) + mode label chip. Back: definition + optional example sentence. Flip: CSS 3D transform, ease-out-quart, ≤300ms. No bounce. Keyboard: `Space` flips, `→`/`←` navigates. Mode label always visible on card face, never hidden in a menu.

### Multiple-choice Quiz
Four answer options as tappable full-width rows, displayed vertically. One question per screen. Correct: teal-green background tint. Incorrect: red tint + reveal correct answer. Selection locks the screen — no double-select. Streak meter visible at top, unobtrusive. Keyboard: `1`–`4` to select.

### Written-answer Quiz
Single text input centered below the term. `Enter` submits — primary action, no competing binding on quiz screens. Correct: teal-green feedback below input. Incorrect: correct answer displayed in muted text. This mode receives the same layout quality and responsive care as multiple-choice. It is not a bonus feature.

### Streak Drop Overlay (5-streak Reward)
Anatomy: (1) Backdrop dims study surface. (2) Reward container — coral-purple border, modal shadow. (3) `<video>` or CSS visual fallback if no asset. (4) `<audio>` plays `drop-5.mp3` if file exists, silent otherwise. (5) Skip/Close button — always visible, minimum 44×44px tap target. (6) After dismiss: restore study surface exactly, reset streak to 0, continue.

Asset paths (Phase 1 placeholders):
```
public/rewards/correct-soft.mp3
public/rewards/combo-3.mp3
public/rewards/drop-5.mp3
public/rewards/drop-video-1.mp4
```

Replacing a reward asset requires only file replacement — zero code changes.

### Buttons
- **Primary:** Teal-green fill, ink-dark or white text, gently curved (radius `0.5rem`). Used for primary actions: "Start", "Submit", "Next".
- **Ghost:** Transparent, soft border, muted text. Used for secondary actions: "Skip", "Back", "Cancel".
- **Danger:** Red-tinted, for destructive actions (delete deck/card).
- Hover: ease-out-quart 150ms. No bounce.

### Inputs / Fields
- Stroke border (Soft Border color), warm paper background, radius `0.5rem`.
- Focus: teal-green border shift, no outer glow.
- Placeholder text: Muted Text color.
- Written-answer input: mono font, slightly larger (Title-adjacent size) to feel as prominent as the term above it.

## 6. Do's and Don'ts

### Do:
- **Do** use Be Vietnam Pro with `&subset=vietnamese` for all text.
- **Do** treat Flashcard, Multiple-choice, and Written-answer as three equal core surfaces with identical layout care.
- **Do** always show the mode label (`ENGLISH → VIETNAMESE` / `VIETNAMESE → ENGLISH`) on every learning screen.
- **Do** bind `Enter` exclusively to answer submission on quiz screens.
- **Do** implement audio/video as graceful enhancement — app must work fully without any file in `public/rewards/`.
- **Do** keep the Streak Drop overlay dismissible within 1 second of appearing. One close button, consistent position.
- **Do** escalate color in exactly three steps: teal-green → amber-orange → coral-purple overlay only.
- **Do** use flat surfaces and background tints for depth. Reserve shadows for modal-level overlays only.
- **Do** cap Streak Drop video at ≤15 seconds and always provide a skip button.
- **Do** respect `prefers-reduced-motion` — trigger visual color burst without motion if preference is set.
- **Do** design `public/rewards/` slots so replacing assets requires zero code changes.

### Don't:
- **Don't** use Quizlet's brand blue or any hue in the blue-indigo family (oklch hue 240–280) as an accent.
- **Don't** implement Duolingo-style persistent gamification: no streak-loss warnings, no XP bars on home screen, no daily push notifications, no heart/life systems.
- **Don't** let the Streak Drop overlay block the study surface for more than 15 seconds without user action.
- **Don't** hardcode real TikTok, YouTube, or online copyrighted music/video URLs. All reward assets are local files only.
- **Don't** treat written-answer mode as a bonus. It receives the same layout space, typography hierarchy, and polish as multiple-choice.
- **Don't** add a sidebar, persistent stat panel, or dense data overlay to learning screens.
- **Don't** bind `Enter` on quiz screens to anything except answer submission.
- **Don't** use gradient text (`background-clip: text`). The coral-purple gradient is for the Streak Drop overlay container only.
- **Don't** use side-stripe borders (`border-left` or `border-right` > 1px as a colored accent). Use full borders or background tints.
- **Don't** add external analytics, tracking scripts, or CDN-hosted media that auto-loads audio/video.
- **Don't** build a chaotic or meme-aesthetic UI. The base is calm, serious, and focused. The reward is brief and controlled.
