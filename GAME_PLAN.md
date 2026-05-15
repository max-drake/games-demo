# Game Plan: Snood (Bubble Shooter)

> First game to implement in the games-demo repo.
> Snood is a bubble-shooter / match-3 game (think Puzzle Bobble / Bust-a-Move).

---

## 1. What is Snood?

Snood is a bubble-shooter game where:
- A grid of colored "snoods" (bubbles) fills the top portion of the play field.
- The player has a shooter at the bottom that can be aimed left/right.
- Firing a bubble causes it to travel in a straight line (bouncing off walls) and snap to the grid.
- When 3 or more same-color bubbles are connected, they pop and are removed.
- Any bubbles no longer connected to the top ceiling fall off-screen and are also removed.
- The grid slowly advances downward over time (or after N shots).
- Game over when bubbles reach the bottom line.

---

## 2. High-Level Architecture

```
client/
  pages/
    Root.tsx          <- add a route/link to "/snood"
    Room.tsx          <- existing multiplayer tldraw room (unchanged)
    snood/
      SnoodPage.tsx   <- top-level page, holds game state, renders canvas
      useSnoodGame.ts <- pure game logic hook (state machine)
      SnoodCanvas.tsx <- renders the grid + shooter using <canvas> or SVG
      snoodTypes.ts   <- TypeScript types for the game
      snoodLogic.ts   <- collision detection, grid snapping, match-finding, fall logic
      snoodConstants.ts <- grid dimensions, colors, timing
```

No tldraw canvas is needed for Snood - it is a standalone HTML5 canvas / SVG page.

---

## 3. Data Model (snoodTypes.ts)

```ts
type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

interface Cell {
  row: number;
  col: number;
  color: Color;
}

interface Bubble {
  x: number;        // pixel position (center)
  y: number;
  color: Color;
  vx: number;       // velocity pixels/frame
  vy: number;
}

interface GameState {
  grid: Map<string, Cell>;   // key = "row,col"
  currentBubble: Bubble | null;
  nextColor: Color;
  aimAngle: number;          // radians from vertical
  score: number;
  shotsUntilAdvance: number;
  status: 'idle' | 'aiming' | 'flying' | 'popping' | 'gameover';
}
```

---

## 4. Grid Layout

- Grid type: Hexagonal offset grid (even rows offset by half a cell width) - classic bubble-shooter feel.
- Rows: 10-12 rows initially filled (top portion of screen).
- Cols: 11-13 columns depending on screen width.
- Cell radius: ~26px (scales with viewport).
- Ceiling: row 0 is the fixed "ceiling" - bubbles connected to it survive; those disconnected fall.

```
 Row 0:  O O O O O O O O O O O   <- ceiling anchor row
 Row 1:   O O O O O O O O O O
 Row 2:  O O O O O O O O O O O
 ...
 Row N:  (danger zone line)
              [shooter]
```

---

## 5. Core Game Loop (useSnoodGame.ts)

Use requestAnimationFrame for the game loop.

### States & Transitions

```
idle
  -> player moves mouse/touches -> aiming
aiming
  -> player clicks/taps -> flying (spawn bubble, set velocity from aimAngle)
flying
  -> bubble hits a wall -> reflect vx (bounce)
  -> bubble reaches grid position -> snap to grid
    -> run match detection
      -> if matches found -> popping (animate, remove, check falls)
      -> if no matches -> back to aiming
      -> check game-over condition -> gameover
popping
  -> animation done -> aiming
gameover
  -> player presses restart -> idle
```

### Advance Timer
- Every SHOTS_PER_ADVANCE (e.g. 5) shots without clearing, add a new row at the top and shift everything down.

---

## 6. Key Algorithms (snoodLogic.ts)

### 6a. Grid Snapping
When a flying bubble stops (hit top wall, or distance to nearest occupied cell < threshold):
1. Convert pixel (x, y) to nearest empty hex grid cell (row, col).
2. Place bubble at that cell.

```ts
function snapToGrid(x: number, y: number, grid: Map<string, Cell>): [number, number]
```

### 6b. Match Detection (Flood Fill)
1. Starting from the newly placed cell, BFS/DFS over neighboring cells.
2. Collect all connected cells of the same color.
3. If count >= 3, mark them for removal.

```ts
function findMatches(grid: Map<string, Cell>, origin: [number,number]): [number,number][]
```

### 6c. Disconnected Bubble Detection (Fall)
After removing matched cells:
1. BFS from every cell in row 0 (the ceiling row).
2. Any cell NOT reachable from row 0 is disconnected -> mark for fall (animate downward, then remove).

```ts
function findDisconnected(grid: Map<string, Cell>): [number,number][]
```

### 6d. Hex Neighbor Lookup
```ts
// Offset grid neighbors depend on whether row is even or odd
function getNeighbors(row: number, col: number): [number, number][]
```

### 6e. Collision Detection (Wall Bounce)
- Left wall: if bubble.x - r < 0, flip vx.
- Right wall: if bubble.x + r > canvasWidth, flip vx.
- Top wall: snap to grid (bubble has reached the top).
- Nearby occupied cell: if distance from bubble center to any occupied cell center < 2r, snap.

---

## 7. Rendering (SnoodCanvas.tsx)

Use a <canvas> element with a useEffect + requestAnimationFrame loop.

### Draw Order (each frame)
1. Background - dark gradient fill.
2. Grid bubbles - draw each occupied cell as a colored circle with a subtle shine highlight.
3. Danger line - horizontal dashed line near the bottom.
4. Flying bubble - draw the in-flight bubble at its current (x, y).
5. Aim guide - dotted line from shooter, bouncing off walls, showing projected path.
6. Shooter - arrow/triangle at the bottom center, rotated to aimAngle.
7. Next bubble preview - small circle showing the next color.
8. HUD - score, level, shots remaining before advance.

---

## 8. Controls

| Input | Action |
|-------|--------|
| Mouse move / touch drag | Update aimAngle |
| Click / tap | Fire bubble |
| R key | Restart (when game over) |

Clamp aimAngle so the player cannot aim straight down or behind themselves (e.g. 10-170 degrees from horizontal).

---

## 9. Scoring

| Event | Points |
|-------|--------|
| Pop 3 bubbles | 100 |
| Pop 4 bubbles | 200 |
| Pop 5+ bubbles | 100 x (count - 2) |
| Each fallen bubble | +10 bonus |
| Combo (chain pops in one shot) | x2 multiplier |

---

## 10. Levels / Difficulty

- Level 1: 6 rows filled, 4 colors, advance every 8 shots.
- Level 2: 8 rows, 5 colors, advance every 7 shots.
- Level 3+: 10 rows, 6 colors, advance every 5 shots, bubbles move faster.

Level up every time the board is cleared (or after N pops milestone).

---

## 11. Visual Polish (nice-to-haves, post-MVP)

- Bubble pop animation (scale + fade out).
- Fall animation (bubbles drop with gravity, fade out).
- Particle burst on pop.
- Background themed backdrop (cartoon snood faces on bubbles).
- Sound effects: fire, pop, fall, game-over.
- High score persistence (localStorage).

---

## 12. Routing

Add Snood to the existing app router in client/pages/Root.tsx:
- Add a route: /snood -> <SnoodPage />
- Add a link on the home/landing page

---

## 13. Implementation Order (Suggested Sprints)

### Sprint 1 - Static Board
- [ ] Define types (snoodTypes.ts, snoodConstants.ts)
- [ ] Render a static hex grid of colored bubbles on <canvas>
- [ ] Draw shooter and aim guide

### Sprint 2 - Core Mechanics
- [ ] Implement game loop in useSnoodGame.ts
- [ ] Fire + fly + wall bounce
- [ ] Grid snapping (snapToGrid)
- [ ] Match detection + bubble removal (findMatches)
- [ ] Disconnected fall detection (findDisconnected)

### Sprint 3 - Game Feel
- [ ] Score + HUD
- [ ] Grid advance (timer / shot counter)
- [ ] Game-over detection and screen
- [ ] Restart flow

### Sprint 4 - Polish
- [ ] Pop & fall animations
- [ ] Difficulty levels
- [ ] Sound (optional)
- [ ] Mobile touch controls
- [ ] localStorage high score

---

## 14. Files to Create (Summary)

| File | Purpose |
|------|---------|
| client/pages/snood/snoodTypes.ts | TypeScript types |
| client/pages/snood/snoodConstants.ts | Grid size, colors, timing |
| client/pages/snood/snoodLogic.ts | Pure functions: snap, match, fall, neighbors |
| client/pages/snood/useSnoodGame.ts | React hook: game state + loop |
| client/pages/snood/SnoodCanvas.tsx | Canvas renderer component |
| client/pages/snood/SnoodPage.tsx | Page wrapper, layout |
| client/pages/Root.tsx | Add /snood route + nav link |

---

*This plan covers everything needed to go from zero to a fully playable browser-based Snood clone. Start with Sprint 1 for a visible result quickly.*
