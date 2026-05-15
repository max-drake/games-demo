# Game Plan: Space Invaders

> Second game to implement in the games-demo repo.
> A faithful recreation of the 1978 arcade classic with pixel-art canvas rendering.

## What is Space Invaders?

Classic fixed-shooter arcade game:
- Player cannon at the bottom, moves left/right, shoots upward
- 5x11 grid of alien enemies that march left/right, step down on wall hit
- 4 destructible shield bunkers between player and enemies
- Mystery UFO for bonus points
- Win by destroying all enemies; lose if they reach the bottom or you run out of lives

## Enemy Types

| Row(s) | Type    | Score |
|--------|---------|-------|
| 0      | Squid   | 30 pts |
| 1-2    | Crab    | 20 pts |
| 3-4    | Octopus | 10 pts |
| UFO    | Mystery | 150 pts |

## Controls

- Left/A: Move left
- Right/D: Move right
- Space/Up: Fire (one bullet at a time)

## Technical Design

- React + TypeScript + HTML5 Canvas (800x600)
- requestAnimationFrame loop with pure tickGame(state, keys) -> state
- File: client/pages/SpaceInvaders.tsx
- Route: /space-invaders
- Same architecture as the existing Lemmings game

## Implemented Features

- 55-enemy formation (5 rows x 11 cols) with animated sprites
- Dynamic speed scaling (faster as enemies are killed)
- Destructible shields with pixel-level damage
- Enemy random firing (up to 3 bullets at once)
- UFO bonus saucer
- Player invincibility flash after being hit
- Multi-wave progression (score/lives carry over)
- High-score tracking per session
