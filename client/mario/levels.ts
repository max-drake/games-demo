/**
 * levels.ts
 * Tilemap format, tile definitions, and level data for Super Mario World–style gameplay.
 *
 * Coordinate system:
 *   - Row 0 is the TOP of the level (sky), row increases downward.
 *   - Col 0 is the leftmost tile, col increases to the right.
 *   - Each tile is 16×16 pixels at native resolution (scale as needed).
 *
 * World 1-1 is encoded as a 15-row × 212-column 2D grid.  The visible
 * viewport is 16 columns wide; the level scrolls horizontally.
 */

// ---------------------------------------------------------------------------
// Tile enum
// ---------------------------------------------------------------------------

/** Every distinct tile type used in the game. */
export const enum Tile {
	/** Transparent / empty air cell */
	AIR = 0,

	// ── Terrain ─────────────────────────────────────────────────────────────
	/** Solid ground (brown dirt body, used below surface) */
	GROUND = 1,
	/** Top surface of the ground (has the grass/dirt cap sprite) */
	GROUND_TOP = 2,
	/** Solid stone brick platform */
	STONE = 3,

	// ── Interactive blocks ───────────────────────────────────────────────────
	/** Yellow ? block (hit for coins / power-ups) */
	QUESTION_BLOCK = 4,
	/** ? block after it has been hit — depleted */
	USED_BLOCK = 5,
	/** Breakable brick block */
	BRICK = 6,
	/** Invisible block (revealed on hit) */
	HIDDEN_BLOCK = 7,

	// ── Coins ────────────────────────────────────────────────────────────────
	/** Collectible coin floating in the air */
	COIN = 8,

	// ── Pipes ────────────────────────────────────────────────────────────────
	/** Top-left cap of a pipe (2-tile wide) */
	PIPE_TOP_LEFT = 9,
	/** Top-right cap of a pipe */
	PIPE_TOP_RIGHT = 10,
	/** Left body segment of a pipe */
	PIPE_BODY_LEFT = 11,
	/** Right body segment of a pipe */
	PIPE_BODY_RIGHT = 12,

	// ── Enemy spawn markers ───────────────────────────────────────────────────
	/** Spawn point for a Goomba (walks left) */
	SPAWN_GOOMBA = 13,
	/** Spawn point for a Koopa Troopa (walks left, green) */
	SPAWN_KOOPA = 14,
	/** Spawn point for a Piranha Plant (rises from a pipe) */
	SPAWN_PIRANHA = 15,

	// ── Special ──────────────────────────────────────────────────────────────
	/** Player start position marker (treated as AIR at runtime) */
	PLAYER_START = 16,
	/** Level end goal (flag-pole base) */
	GOAL_POLE = 17,
}

// ---------------------------------------------------------------------------
// Collision flags
// ---------------------------------------------------------------------------

/** Bit-flags that describe how a tile interacts with the physics engine. */
export const enum CollisionFlag {
	NONE = 0,
	/** Blocks movement from any direction (solid wall/floor/ceiling) */
	SOLID = 1 << 0,
	/** Only blocks movement from above — pass-through from below / sides */
	PLATFORM = 1 << 1,
	/** Can be broken by a powered-up player jumping into it from below */
	BREAKABLE = 1 << 2,
	/** Bounces/activates when hit from below */
	INTERACTIVE = 1 << 3,
	/** Collected on contact (no blocking) */
	COLLECTIBLE = 1 << 4,
	/** Spawns an enemy entity at level load (treated as AIR physically) */
	SPAWN_MARKER = 1 << 5,
	/** Contains / is part of a pipe (can transport player/enemies) */
	PIPE = 1 << 6,
}

/**
 * Collision flags assigned to each Tile value.
 * Keyed by the numeric value of each Tile member so it works with const enums.
 */
export const TILE_COLLISION: Readonly<Record<number, number>> = {
	[0 /* AIR */]: 0 /* NONE */,
	[1 /* GROUND */]: 1 /* SOLID */,
	[2 /* GROUND_TOP */]: 1 /* SOLID */,
	[3 /* STONE */]: 1 /* SOLID */,
	[4 /* QUESTION_BLOCK */]: 1 | 8 /* SOLID | INTERACTIVE */,
	[5 /* USED_BLOCK */]: 1 /* SOLID */,
	[6 /* BRICK */]: 1 | 4 | 8 /* SOLID | BREAKABLE | INTERACTIVE */,
	[7 /* HIDDEN_BLOCK */]: 8 /* INTERACTIVE – not solid until triggered */,
	[8 /* COIN */]: 16 /* COLLECTIBLE */,
	[9 /* PIPE_TOP_LEFT */]: 1 | 64 /* SOLID | PIPE */,
	[10 /* PIPE_TOP_RIGHT */]: 1 | 64 /* SOLID | PIPE */,
	[11 /* PIPE_BODY_LEFT */]: 1 | 64 /* SOLID | PIPE */,
	[12 /* PIPE_BODY_RIGHT */]: 1 | 64 /* SOLID | PIPE */,
	[13 /* SPAWN_GOOMBA */]: 32 /* SPAWN_MARKER */,
	[14 /* SPAWN_KOOPA */]: 32 /* SPAWN_MARKER */,
	[15 /* SPAWN_PIRANHA */]: 32 /* SPAWN_MARKER */,
	[16 /* PLAYER_START */]: 0 /* NONE */,
	[17 /* GOAL_POLE */]: 0 /* NONE */,
} as const

// ---------------------------------------------------------------------------
// Tile metadata helpers
// ---------------------------------------------------------------------------

/** True if a tile completely blocks movement. */
export function isSolid(tile: Tile): boolean {
	return ((TILE_COLLISION[tile] ?? 0) & 1 /* SOLID */) !== 0
}

/** True if a tile is only a one-way platform (solid from above). */
export function isPlatform(tile: Tile): boolean {
	return ((TILE_COLLISION[tile] ?? 0) & 2 /* PLATFORM */) !== 0
}

/** True if the tile triggers a bump reaction when hit from below. */
export function isInteractive(tile: Tile): boolean {
	return ((TILE_COLLISION[tile] ?? 0) & 8 /* INTERACTIVE */) !== 0
}

/** True if the tile is collected on contact. */
export function isCollectible(tile: Tile): boolean {
	return ((TILE_COLLISION[tile] ?? 0) & 16 /* COLLECTIBLE */) !== 0
}

/** True if the tile marks an enemy spawn location. */
export function isSpawnMarker(tile: Tile): boolean {
	return ((TILE_COLLISION[tile] ?? 0) & 32 /* SPAWN_MARKER */) !== 0
}

// ---------------------------------------------------------------------------
// Level data type
// ---------------------------------------------------------------------------

/** A level is described by its tilemap plus a few metadata fields. */
export interface LevelData {
	/** Human-readable identifier, e.g. "1-1" */
	id: string
	/** Tile width of the entire level (number of columns) */
	width: number
	/** Tile height of the level (number of rows) */
	height: number
	/**
	 * Row-major 2D tile array: `tiles[row][col]`.
	 * `tiles.length === height`, `tiles[0].length === width`.
	 */
	tiles: number[][]
}

// ---------------------------------------------------------------------------
// Shorthand aliases – make the 2-D array readable
// Numeric literals are used so the file does not rely on const-enum inlining
// at the usage site.
// ---------------------------------------------------------------------------

const _ = 0  // AIR
const G = 1  // GROUND
const T = 2  // GROUND_TOP
const S = 3  // STONE
const Q = 4  // QUESTION_BLOCK
const B = 6  // BRICK
const C = 8  // COIN
const PL  = 9   // PIPE_TOP_LEFT
const PR  = 10  // PIPE_TOP_RIGHT
const PBL = 11  // PIPE_BODY_LEFT
const PBR = 12  // PIPE_BODY_RIGHT
const EG  = 13  // SPAWN_GOOMBA
const EK  = 14  // SPAWN_KOOPA
// const EP = 15  // SPAWN_PIRANHA  (reserved – not placed in 1-1)
const PS  = 16  // PLAYER_START
const GP  = 17  // GOAL_POLE

// ---------------------------------------------------------------------------
// World 1-1 tilemap  (15 rows × 212 cols)
//
// Row  0–2  — top sky (mostly air)
// Row  3–5  — floating brick / ? rows
// Row  6–12 — mid-sky: coins, enemy spawns, pipes, staircase
// Row 13    — GROUND_TOP  (walkable surface)
// Row 14    — GROUND      (underground fill)
// ---------------------------------------------------------------------------

// Each row is exactly 212 tiles wide.
// prettier-ignore
const W11_TILES: number[][] = [
	// row 0 – top sky
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 1 – upper sky
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 2 – sky (coin row visible above ? blocks)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 3 – high brick / ? row (upper floating blocks)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 4 – main brick / ? block row (hit from below)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,B,_,Q,_,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,Q,B,B,Q,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 5 – low ? blocks (tall hit-blocks, single tile high)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,Q,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,Q,_,_,Q,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 6 – mid-sky: coins above first ? blocks, coins above second set
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,C,C,C,C,C,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,C,_,_,C,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 7 – Goomba spawns + first pipe top
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,EG,_,_,_,_,_,_,_,_,_,EG,_,_,PL,PR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,EG,EG,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 8 – first pipe body top / second pipe top, Koopa spawn
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PL,PR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,EK,_,_,_,_,PL,PR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 9 – pipe bodies, staircase begins
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 10 – pipe bodies, staircase (2 wide)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PBL,PBR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 11 – staircase (3 wide)
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],

	// row 12 – staircase (4 wide), goal pole
	[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,GP,_,_,_,_,_,_,_,_,_,_,_],

	// row 13 – GROUND_TOP (walkable surface, full width)
	[PS,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],

	// row 14 – GROUND (underground fill, full width)
	[G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
]

// ---------------------------------------------------------------------------
// World 1-1 level definition
// ---------------------------------------------------------------------------

/** World 1-1: the classic opening level. */
export const LEVEL_1_1: LevelData = {
	id: '1-1',
	width: 212,
	height: 15,
	tiles: W11_TILES,
}

/** All levels in order; index 0 = World 1-1. */
export const LEVELS: LevelData[] = [LEVEL_1_1]

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/**
 * Return the tile at (col, row) in a level, or `Tile.AIR` (0) if out of bounds.
 */
export function getTile(level: LevelData, col: number, row: number): number {
	if (row < 0 || row >= level.height || col < 0 || col >= level.width) return 0 /* AIR */
	return level.tiles[row][col]
}

/**
 * Return a new level with a single tile replaced (immutable).
 * Used to convert a QUESTION_BLOCK → USED_BLOCK after it is hit, etc.
 */
export function setTile(level: LevelData, col: number, row: number, tile: number): LevelData {
	const tiles = level.tiles.map((r, ri) =>
		ri === row ? r.map((c, ci) => (ci === col ? tile : c)) : r
	)
	return { ...level, tiles }
}

/**
 * Collect all spawn-marker tiles from a level and return them as a list of
 * `{ col, row, tile }` entries.  The caller uses this to instantiate enemies.
 */
export function getSpawnPoints(
	level: LevelData
): Array<{ col: number; row: number; tile: number }> {
	const spawns: Array<{ col: number; row: number; tile: number }> = []
	for (let row = 0; row < level.height; row++) {
		for (let col = 0; col < level.width; col++) {
			const tile = level.tiles[row][col]
			if (isSpawnMarker(tile)) {
				spawns.push({ col, row, tile })
			}
		}
	}
	return spawns
}

/**
 * Find the player start position in a level.
 * Returns `{ col, row }` or `{ col: 0, row: level.height - 2 }` as a fallback.
 */
export function getPlayerStart(level: LevelData): { col: number; row: number } {
	for (let row = 0; row < level.height; row++) {
		for (let col = 0; col < level.width; col++) {
			if (level.tiles[row][col] === 16 /* PLAYER_START */) {
				return { col, row }
			}
		}
	}
	return { col: 0, row: level.height - 2 }
}
