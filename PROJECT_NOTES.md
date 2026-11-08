# Noah's Ark — project notes (for Claude, picking this up on another machine)

Written for: a future Claude Code session with no memory of this one.

## What this is
A static, no-build, vanilla HTML/CSS/JS kids' game: three short minigames telling the
Noah's Ark story. No npm, no bundler, no server needed — open `Index.html` directly in
a browser (or `Start-Process Index.html` on Windows) to run it. Git repo, `main` branch,
no remote configured as of this writing.

## Files
- `Index.html` — all markup. One `<body>` with a `<header>` and several `<section class="screen">`
  blocks (`intro`, `game1`, `game2`, `game3`, `overlay`) plus a `tutorial` dialog. Only the
  element with class `screen active` is visible (toggled by `show()` in game.js).
- `style.css` — all styling, single file, mobile breakpoints at 768px/480px/360px near the bottom.
- `game.js` — all game logic, vanilla JS, no modules/imports. Organized in commented sections:
  tutorial, navigation, minigame 1 (incremental/clicker), minigame 2 (memory), minigame 3 (survival).
- `sounds.js` — a small synthesized SFX engine (`SFX` global) built on the WebAudio API. No audio
  files; everything is procedurally generated (oscillators/noise). Call `SFX.play('name')` for
  one-shots and `SFX.windOn()/rainOn()/grassOn()/ambientOff()` for ambient loops per stage.
- `sprites/*.png` — small UI icons, rendered inline via the `I(name, cls)` helper in game.js
  (`<img src="sprites/name.png" class="icon ...">`). Also used for animal/tree/critter art.
- `Imagens/*.jpg` — full-bleed background photos per screen, applied via
  `body:has(#game1.active) { background: ... }` etc. in style.css (CSS `:has()` is relied on —
  works in all current evergreen browsers, no fallback needed).

## Navigation model
- `goStage(n)` shows `#game{n}`, runs the tutorial dialog first if `storyMode` is true, then
  calls `startGame1/2/3()`.
- `storyMode` is set from whether the user clicked "Follow the story" (sequential, tutorials on)
  vs a direct minigame card on the intro screen (`data-direct` attribute → skips tutorial, resets
  `carriedPlanks`).
- `carriedPlanks` threads the plank count from minigame 1 into minigame 3's starting plank stock.
- `overlay(title, text, btnText, cb, btn2Text?, cb2?)` shows the shared `#overlay` modal card.
  `btn2Text`/`cb2` are optional — when given, a second "ghost" button appears (e.g. a cancel/decline
  option) that just closes the overlay and runs `cb2` (or nothing) instead of `cb`. Used e.g. so the
  "move to next stage" prompt in minigame 1 can be declined without losing progress.
- `confettiBurst(count?)` spawns a short-lived full-viewport confetti animation (plain divs +
  CSS `@keyframes confettiFall`, no library), and plays the cha-ching sound. It's called at the end
  of each of the 3 minigames (in minigame 2, only at the end of the herding phase).

## Minigame 1 — Building the Ark (`G1`, `startGame1` ~game.js:101)
Idle-clicker: click trees on `#map` to deal damage (`chop`/`damageTree`), each felled tree gives
wood and respawns elsewhere; craft wood into planks (5 wood → 1 plank); 5 purchasable `UPGRADES`
(axe damage, wood yield, auto-workers wood/s, auto-saw planks/s). Goal: 300 planks (`GOAL`), hard
cap 1000 (`MAX_PLANKS`). On reaching the goal, `endGame1()` fires confetti and reveals `#nextBtn`.
Clicking it opens a **confirm dialog** (added per user request) — it does NOT advance immediately;
the player must click "Confirm · Call the animals" (or "Keep collecting planks" to stay and keep
grinding past 300, up to the 1000 cap).
Upgrade rows: clicking either the small button (`#b_<id>`) or the icon+title (`#t_<id>`, added so
the icon is also clickable) buys one level.

## Minigame 2 — The Animals (`M` + `H`, `startGame2` in game.js)
Two phases on the same screen (`#game2`):

### Phase 1: memory
A classic pairs game: 16 cards (8 animal pairs) in `#memBoard`, with a timer, moves and pairs in
`#memStats`. When the 8th pair is found, `endGame2()` saves the time in `M.memTime` and slides
every card off to the left (`.mcard.slide-out`, staggered per column/row). `#game2` has
`overflow-x:hidden` so the slide doesn't create a horizontal scrollbar. There is **no confetti at
this point**. The confetti only comes at the end of phase 2.

### Phase 2: herding (the "pens"), added at the user's request
- Then `#memBoard` and `#memStats` are hidden, `#memTitle` / `#memHint` get new text, and `#herd`
  comes in from the right (`.slide-in`). `startGame2()` restores everything for a new game, using
  the `MEM_TITLE` / `MEM_HINT` constants.
- **Controls:** with the mouse, just hover near the animals (no click needed). With a finger,
  hold it near them. Animals within `reach` (2.6× the animal size) are pushed directly away from
  the pointer, harder the closer the pointer is. A dashed ring (`#herdCursor`) shows the reach.
  The pointer handlers are wired up once in an IIFE right after `startHerd`.
- **Animals** (`HERD_KINDS`): sheep, rabbit, camel and giraffe, 2 of each. Each kind has its own
  `speed` (the rabbit is the fastest), `faces` (which way the sprite looks: sheep and camel face
  right, rabbit and giraffe face left) and `tall` (height relative to the base size, since
  the giraffe is tall). The base size scales with the field (`w * 0.065`, between 34 and 62px).
  The animals push each other apart so they don't overlap. When nobody is pushing they wander a
  little, unless they're already in their own pen.
- **Walking animation:** `.walk` (a bob and sway in `@keyframes herdWalk`) while moving. `.flip`
  mirrors the sprite with the CSS `scale` property (not `transform`, which the animation uses).
- **Pens** (`PENS`, as fractions of the field): 4 small ones, 2 on the left and 2 on the right.
  Each is a closed fence box. The gate is the middle half of the side facing the center, and the
  pens are created by `startHerd()` (they're not in the HTML). Which animal goes in which pen is
  shuffled each game, and a faded picture of the animal (`.pen-sign`) shows which pair goes there.
- **Collision:** `penWalls()` turns each pen into fence segments in pixels, and `collideWall()`
  pushes the animal (a circle of radius `rad`) out of each segment. Animals can only get in or out
  through the gate. I validated this with a Node simulation: it goes in through the gate, gets
  blocked by the side and top fences, and stays inside once the gate is closed. The animals'
  maximum speed per frame is smaller than `rad`, so they don't "tunnel" through fences.
- **Closing:** when a pen holds **exactly its own pair and no one else**, the gate closes
  (`.closed`: the gate animates in, the pen turns green, `SFX.play('match')`), and a gate segment
  is added to the collision, so the animals are locked in.
- **Win:** when all 4 pens are closed (after 0.5s), `herdWin()` fires the confetti, the
  cha-ching and the overlay. The overlay shows the memory time and moves, the herding time, and
  stars based on the memory time (<40s = 3, <70s = 2, otherwise 1). Then it goes to minigame 3.
- **Look:** the field (`.herd`) has a transparent background and border (at the user's request),
  so only the brown fences show, with a light outline (`filter: drop-shadow`) so they stand out
  against the photo. Aspect ratio 16/10, or 1/1 on phones (≤600px).
- The stage 2 tutorial has a 4th step explaining the pens.
- Tuning values (push force `speed * 9`, `reach`, wander, friction `0.05^dt`) were chosen
  without play-testing. Adjust them if the user says it's too easy or too hard.

## Minigame 3 — The Flood (`W`, `startGame3` ~game.js:339)
Real-time survival sim over 40 in-game days (`DAY_LEN` seconds each):
- Hull `leaks` open randomly; click to repair for planks (`REPAIR_COST`).
- `#animals` farm list (`FARM`) lose hunger over time (`drain` per animal); click to feed for food,
  costing `FEED_COST` and showing a floating `-N 🍎` above the animal's head (`floatFeed`, added
  per user request — the sign must stay negative, representing food consumed).
- Small "critters" (`SMALL`) spawn and walk down `#lane` toward the lion; drag them to the safe pen
  before they reach `LION_X`, or they're lost (`eatCritter`). Day 40 opens 4 extra hull leaks
  (`EXTRA_LEAK_SPOTS`). (The old day-20 burst of 3 critters was removed at the user's request.)
- Losing 3+ animals total (`MAX_LOST`, dead farm animals + eaten critters) or the boat flooding
  fully → `lose()`. Surviving to day 40 → `win()` (confetti + "Play again" returns home and resets
  `carriedPlanks`).

## Layout conventions (as of the latest session)
The page is a flex column at least as tall as the viewport: `body { min-height:100dvh; display:flex;
flex-direction:column }`, `header { flex-shrink:0 }`, and `.screen.active { display:flex;
flex-direction:column; flex:1 1 auto; min-height:0; width:100% }`. Whichever screen is active fills
at least the remaining viewport height, and the page scrolls if the content is taller (see
"Responsiveness"). `#game1`/`#game2`/`#game3`
also have `max-width:none` (no width cap) so they go edge-to-edge.
- **Minigame 2 & 3** lean into this: `.flood` and `#game2 .card.wide` are themselves
  `flex:1 1 auto` boxes that fill the screen (both are transparent now, so the background photo
  shows through), and the actual game content inside is pixel-capped and centered (`.boat`,
  `.waterbox { flex:1 }` so the boat sits low with open "sky" above it; `#memBoard` and `#herd`
  use `margin:auto` to center inside the box).
- **Minigame 1 is different on purpose**: `#map` has no background "card" of its own — the map
  *is* the scene — so letting it stretch edge-to-edge made the (fixed-pixel-size) tree sprites
  look tiny and sparse on big screens. Fix: `#game1.screen.active { align-items:center;
  justify-content:center }` plus `.layout { max-width:1360px; flex:0 1 auto }` and
  `#map { aspect-ratio:3/2; max-height:78vh }` — so minigame 1's play area is capped and centered
  on the page background (`Imagens/Fundo.jpg`) rather than stretched, matching the visual scale of
  the other two minigames. If asked to resize things again, keep this distinction in mind: 2 and 3
  are "full-bleed box with capped content inside", 1 is "capped box centered on the page bg".

## Responsiveness (phone / tablet / notebook / desktop)
- The page is **not** locked to the viewport height. `body { min-height:100dvh }` (no
  `html, body { height:100% }`), so when a screen's content is taller than the viewport the page
  scrolls normally. The old fixed-height version made minigame 1 (vertically centered) overflow
  past the *top* of the screen, out of reach, on notebooks and phones. Don't bring it back.
- Minigame 1: `.layout` is 2 columns (`1fr 360px`), `1fr 300px` at ≤1100px, 1 column at ≤860px.
  On ≥861px the panel gets `max-height: calc(100dvh - 100px); overflow-y:auto` so it scrolls
  internally instead of pushing the page; `#map` has `max-height: min(78vh, calc(100dvh - 130px))`.
- Minigame 2: `#game2 #memBoard { max-width: min(600px, calc(100dvh - 270px)) }` so the board fits
  the screen height. Note `#game2 #memBoard` beats the plain `#memBoard` media-query rules on
  specificity, so phone tweaks to the board must use the `#game2` prefix.
- Minigame 3: `.boat` width is `clamp(240px, min(78%, (100dvh - 470px) * 1.89), 560px)`, which
  shrinks the boat on short screens (1.89 = the width/height ratio of `FinishedArk.png`, 2104×1114).
  The hull leak buttons are positioned in **percentages** of the boat (`left: x%`, `top: 47%/64%`)
  and centered with CSS `translate: -50% -50%`. They used to be fixed `top: 120px/170px`, which
  put the drops below the boat whenever it shrank. Keep them in percentages. Use `translate`, not
  `transform`, because the `pulse` animation already uses `transform`.
- `#overlay` and `#tutorial` have `overflow-y:auto`, and their card has `margin:auto`, so long
  dialogs can scroll on small phones.
- Breakpoints at 768px / 480px / 360px near the bottom of style.css, plus `pointer: coarse` for
  larger tap targets.

## Later visual / gameplay changes (all requested by the user)
- **All images non-draggable**: `img { -webkit-user-drag:none }` plus a global
  `document.addEventListener('dragstart', e => e.preventDefault())` at the top of game.js. This
  also fixed a bug where clicking the icon inside a button didn't register: the native image
  drag was swallowing the click.
- Minigame 1: the upgrade subtitles (description text) were removed. Upgrade title icons are
  bigger (`.upg-title .icon { height:2.6em }`). The buy button shows **only the number** (no log
  icon inside it); the icon next to the upgrade *title* stays.
- Minigame 2: the `.card.wide` box is transparent (no background, border or shadow), and the card
  borders are transparent too (this started as a "test" the user asked for; it's easy to revert).
  All text is light cream `#fff8e6` with a dark text-shadow. The title and stats sit inside a
  `.g2-header` dark translucent box (`rgba(0,0,0,.45)`) for readability against the photo.
- Minigame 3: the `.flood` box is transparent (no gradient, no border), so `Imagens/Fundo3.jpg`
  shows through. Rain still falls (`.rain i`, `@keyframes fall` → `translateY(110vh)`). `.msg`
  and `.lane-hint` have a text-shadow. The **day-20 "wave of 3 critters" was removed**, so there
  is no difficulty spike on day 20 anymore. The day-40 extra leaks are still there.
- **Win sound**: `confettiBurst()` also plays `SFX.play('cashRegister')`, a synthesized
  cash-register "cha-ching" defined in sounds.js. Every win therefore gets confetti and the sound.

## Workflow preference
- Don't open the browser (`Start-Process Index.html`) after every change. Only do it when the user
  asks. Just report what changed.
- The user writes in Portuguese (pt-BR). Reply in Portuguese. In-game text is in English.

## Things the user has corrected / confirmed in past sessions (don't redo these)
- Screens should fill the viewport (not a small centered 1100px box) — but see the minigame-1
  exception above; don't blindly re-apply `max-width:none` to `#game1` without also centering it.
- The feed-animal floating number in minigame 3 must show as `-N`, not `+N`.
- Upgrade rows in minigame 1 should be clickable via their icon/title, not just the price button.
- Minigame 1's "next stage" button must ask for confirmation (with a decline option) before
  actually advancing — it previously jumped straight to the stage-complete overlay.
- "Remove the wood icon from the upgrade" meant the log icon **inside the buy button**, not the
  icon next to the title. The title icons stay.
- In minigame 2's herding phase, each pair goes into **its own pen** and the gate closes behind
  it. Finishing (all pens closed) ends the stage automatically.

## No test/build tooling
There is no package.json, linter, or test suite. "Testing" a change means opening `Index.html` in
a browser and clicking through the relevant minigame. For a quick syntax check, run
`node --check game.js` (Node is installed on the user's machine). Pure functions such as
`penWalls`/`collideWall` can be tested by pulling them out of game.js into a small Node script
in the scratchpad.
