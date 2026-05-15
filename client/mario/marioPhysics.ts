/**
 * marioPhysics.ts
 *
 * Pure-logic physics and collision engine for Super Mario World.
 * No React, no canvas — exports functions consumed by the game loop hook.
 *
 * Coordinate system (matches levels.ts / marioTypes.ts):
 *   - X increases to the right (pixels)
 *   - Y increases downward (pixels)
 *   - pos.x / pos.y represent the top-left corner of the entity's AABB
 *
 * "Mario" is the Player type from marioTypes.ts.
 * "LevelData" is from levels.ts.
 * "GameState" is from marioTypes.ts.
 */

import type { AABB, Enemy, GameState, Player } from './marioTypes'
import {
	GRAVITY,
	JUMP_VELOCITY,
	MARIO_SIZE,
	MAX_FALL_SPEED,
	SCORE,
	TILE_SIZE,
	WALK_SPEED,
	RUN_SPEED,
	GROUND_FRICTION,
	HURT_INVINCIBLE_FRAMES,
} from './marioConstants'
import {
	getTile,
	isSolid,
	isCollectible,
	isInteractive,
} from './levels'
import type { LevelData } from './levels'

// ─── Type alias ──────────────────────────────────────────────────────────────

/**
 * Within this module "Mario" is the Player type.
 * The alias makes the function signatures match the spec precisely.
 */
type Mario = Player

// ─── Constants ───────────────────────────────────────────────────────────────

/** Pixels Mario bounces upward when stomping an enemy. */
const STOMP_BOUNCE_VY = -6

/** Fraction of vel.x preserved per frame when no direction key is held. */
const FRICTION_FACTOR = 1 - GROUND_FRICTION

/** Minimum |vel.x| below which velocity is snapped to zero (prevents creep). */
const VEL_X_EPSILON = 0.05

// ─── Geometry helpers ────────────────────────────────────────────────────────

/**
 * AABB overlap test (exclusive on the far edges so touching edges don't count).
 */
export function overlaps(a: AABB, b: AABB): boolean {
	return (
		a.x < b.x + b.w &&
		a.x + a.w > b.x &&
		a.y < b.y + b.h &&
		a.y + a.h > b.y
	)
}

/** Build an AABB from a Mario/Player's current position and power-up state. */
function marioAABB(mario: Mario): AABB {
	const size = MARIO_SIZE[mario.powerUp]
	return { x: mario.pos.x, y: mario.pos.y, w: size.w, h: size.h }
}

/** Build a generic entity AABB given a width and height. */
function entityAABB(pos: { x: number; y: number }, w: number, h: number): AABB {
	return { x: pos.x, y: pos.y, w, h }
}

// ─── Tile-level helpers ───────────────────────────────────────────────────────

/** Convert a pixel X to the tile column it falls in. */
function tileCol(px: number): number {
	return Math.floor(px / TILE_SIZE)
}

/** Convert a pixel Y to the tile row it falls in. */
function tileRow(py: number): number {
	return Math.floor(py / TILE_SIZE)
}

/**
 * Return every tile column overlapped by a horizontal span [left, right).
 * A small inset prevents exactly-aligned edges from bleeding into the next tile.
 */
function colsForSpan(left: number, right: number): number[] {
	const c0 = tileCol(left + 0.5)
	const c1 = tileCol(right - 0.5)
	const cols: number[] = []
	for (let c = c0; c <= c1; c++) cols.push(c)
	return cols
}

/**
 * Return every tile row overlapped by a vertical span [top, bottom).
 */
function rowsForSpan(top: number, bottom: number): number[] {
	const r0 = tileRow(top + 0.5)
	const r1 = tileRow(bottom - 0.5)
	const rows: number[] = []
	for (let r = r0; r <= r1; r++) rows.push(r)
	return rows
}

/** True if any tile in the given column-row pairs is solid. */
function anySolid(level: LevelData, cols: number[], rows: number[]): boolean {
	for (const col of cols) {
		for (const row of rows) {
			if (isSolid(getTile(level, col, row))) return true
		}
	}
	return false
}

// ─── Physics functions ────────────────────────────────────────────────────────

/**
 * Apply gravity to Mario's vertical velocity, clamp to MAX_FALL_SPEED,
 * then integrate velocity into position (Y axis only).
 *
 * Horizontal integration is handled in moveMario so tile collision
 * can be resolved per-axis.
 */
export function applyGravity(mario: Mario): void {
	mario.vel.y += GRAVITY
	if (mario.vel.y > MAX_FALL_SPEED) {
		mario.vel.y = MAX_FALL_SPEED
	}
	mario.pos.y += mario.vel.y
}

/**
 * Resolve tile collisions along both axes, updating mario.pos and mario.vel.
 * Sets mario.grounded = true when Mario is standing on a solid tile.
 *
 * Call order each frame:
 *   1. applyGravity(mario)      — integrates Y
 *   2. moveMario(mario, level)  — resolves Y collision, integrates + resolves X
 */
export function moveMario(mario: Mario, level: LevelData): void {
	const size = MARIO_SIZE[mario.powerUp]
	const w = size.w
	const h = size.h

	// ── Vertical (Y) resolution ──────────────────────────────────────────────
	mario.grounded = false

	if (mario.vel.y >= 0) {
		// Falling / neutral — check feet
		const feetY = mario.pos.y + h
		const cols = colsForSpan(mario.pos.x, mario.pos.x + w)
		const footRow = tileRow(feetY - 0.5)

		if (anySolid(level, cols, [footRow])) {
			mario.pos.y = footRow * TILE_SIZE - h
			mario.vel.y = 0
			mario.grounded = true
		}
	} else {
		// Rising — check head
		const headY = mario.pos.y
		const cols = colsForSpan(mario.pos.x, mario.pos.x + w)
		const headRow = tileRow(headY + 0.5)

		if (anySolid(level, cols, [headRow])) {
			mario.pos.y = (headRow + 1) * TILE_SIZE
			mario.vel.y = 0
		}
	}

	// ── Horizontal (X) integration + resolution ─────────────────────────────
	mario.pos.x += mario.vel.x

	if (mario.vel.x > 0) {
		const rightX = mario.pos.x + w
		const rightCol = tileCol(rightX - 0.5)
		const rows = rowsForSpan(mario.pos.y, mario.pos.y + h)

		if (anySolid(level, [rightCol], rows)) {
			mario.pos.x = rightCol * TILE_SIZE - w
			mario.vel.x = 0
		}
	} else if (mario.vel.x < 0) {
		const leftX = mario.pos.x
		const leftCol = tileCol(leftX + 0.5)
		const rows = rowsForSpan(mario.pos.y, mario.pos.y + h)

		if (anySolid(level, [leftCol], rows)) {
			mario.pos.x = (leftCol + 1) * TILE_SIZE
			mario.vel.x = 0
		}
	}

	// ── Clamp to level bounds ───────────────────────────────────────────────
	if (mario.pos.x < 0) {
		mario.pos.x = 0
		mario.vel.x = 0
	}
	const levelPixelWidth = level.width * TILE_SIZE
	if (mario.pos.x + w > levelPixelWidth) {
		mario.pos.x = levelPixelWidth - w
		mario.vel.x = 0
	}
}

/**
 * Attempt a jump — only executes when Mario is on the ground.
 * Applies JUMP_VELOCITY upward and sets state to 'jumping'.
 */
export function jump(mario: Mario): void {
	if (!mario.grounded) return
	mario.vel.y = JUMP_VELOCITY
	mario.grounded = false
	mario.state = 'jumping'
}

/**
 * Walk left (dir = -1), right (dir = 1), or decelerate (dir = 0).
 * Sets vel.x toward the target speed; applies ground friction when dir = 0.
 * Updates mario.facing and mario.state.
 *
 * @param mario   The player entity.
 * @param dir     -1 = left, 1 = right, 0 = no input (friction applied).
 * @param running Whether the run button is held.
 */
export function walk(mario: Mario, dir: 1 | -1 | 0, running: boolean): void {
	const targetSpeed = running ? RUN_SPEED : WALK_SPEED

	if (dir !== 0) {
		mario.facing = dir === 1 ? 'right' : 'left'
		const target = dir * targetSpeed
		// Set velocity directly toward target; acceleration can be layered on top
		if (Math.abs(mario.vel.x) < targetSpeed || Math.sign(mario.vel.x) !== dir) {
			mario.vel.x = target
		}
		if (mario.grounded) {
			mario.state = running ? 'running' : 'walking'
		}
	} else {
		// No input — friction
		if (mario.grounded) {
			mario.vel.x *= FRICTION_FACTOR
			if (Math.abs(mario.vel.x) < VEL_X_EPSILON) {
				mario.vel.x = 0
			}
			if (mario.state === 'walking' || mario.state === 'running') {
				mario.state = mario.vel.x === 0 ? 'idle' : mario.state
			}
		}
	}
}

// ─── Enemy physics ────────────────────────────────────────────────────────────

/** Hitbox dimensions per enemy type (pixels). */
const ENEMY_SIZE: Record<string, { w: number; h: number }> = {
	goomba:      { w: 14, h: 14 },
	koopaTroopa: { w: 12, h: 24 },
	koopaShell:  { w: 14, h: 14 },
	piranhPlant: { w: 14, h: 24 },
	bullet:      { w: 12, h: 12 },
	rex:         { w: 16, h: 24 },
	boo:         { w: 16, h: 16 },
	thwomp:      { w: 32, h: 32 },
	'bob-omb':   { w: 12, h: 14 },
	cheepCheep:  { w: 14, h: 14 },
	lakitu:      { w: 16, h: 16 },
	spiny:       { w: 14, h: 14 },
}

/** Default walking speed for enemies that patrol. */
const ENEMY_WALK_SPEED = 1

/**
 * Move all enemies each frame:
 *   - Apply gravity and clamp fall speed
 *   - Integrate velocity into position
 *   - Resolve solid-tile collisions (bounce off walls, land on ground)
 * Dead and stomped enemies are skipped.
 */
export function updateEnemies(enemies: Enemy[], level: LevelData): void {
	for (const enemy of enemies) {
		if (enemy.state === 'dead' || enemy.state === 'stomped') continue

		const size = ENEMY_SIZE[enemy.type] ?? { w: 14, h: 14 }
		const { w, h } = size

		// ── Gravity ────────────────────────────────────────────────────────────
		enemy.vel.y += GRAVITY
		if (enemy.vel.y > MAX_FALL_SPEED) enemy.vel.y = MAX_FALL_SPEED

		// Ensure walking enemies have horizontal velocity
		if (enemy.vel.x === 0 && enemy.state === 'walking') {
			enemy.vel.x =
				enemy.facing === 'right' ? ENEMY_WALK_SPEED : -ENEMY_WALK_SPEED
		}

		// ── Vertical integration + ground collision ─────────────────────────────
		enemy.pos.y += enemy.vel.y

		if (enemy.vel.y >= 0) {
			const feetY = enemy.pos.y + h
			const cols = colsForSpan(enemy.pos.x, enemy.pos.x + w)
			const footRow = tileRow(feetY - 0.5)

			if (anySolid(level, cols, [footRow])) {
				enemy.pos.y = footRow * TILE_SIZE - h
				enemy.vel.y = 0
			}
		} else {
			const headY = enemy.pos.y
			const cols = colsForSpan(enemy.pos.x, enemy.pos.x + w)
			const headRow = tileRow(headY + 0.5)

			if (anySolid(level, cols, [headRow])) {
				enemy.pos.y = (headRow + 1) * TILE_SIZE
				enemy.vel.y = 0
			}
		}

		// ── Horizontal integration + wall bounce ────────────────────────────────
		enemy.pos.x += enemy.vel.x

		if (enemy.vel.x > 0) {
			const rightX = enemy.pos.x + w
			const rightCol = tileCol(rightX - 0.5)
			const rows = rowsForSpan(enemy.pos.y, enemy.pos.y + h)

			if (anySolid(level, [rightCol], rows)) {
				enemy.pos.x = rightCol * TILE_SIZE - w
				enemy.vel.x = -Math.abs(enemy.vel.x)
				enemy.facing = 'left'
				enemy.state = 'turning'
			}
		} else if (enemy.vel.x < 0) {
			const leftX = enemy.pos.x
			const leftCol = tileCol(leftX + 0.5)
			const rows = rowsForSpan(enemy.pos.y, enemy.pos.y + h)

			if (anySolid(level, [leftCol], rows)) {
				enemy.pos.x = (leftCol + 1) * TILE_SIZE
				enemy.vel.x = Math.abs(enemy.vel.x)
				enemy.facing = 'right'
				enemy.state = 'turning'
			}
		}

		// Resolve 'turning' back to 'walking' after one frame
		if (enemy.state === 'turning') {
			enemy.state = 'walking'
		}

		// Clamp to level bounds and reverse at edges
		if (enemy.pos.x < 0) {
			enemy.pos.x = 0
			enemy.vel.x = Math.abs(enemy.vel.x)
			enemy.facing = 'right'
		}
		const levelPixelWidth = level.width * TILE_SIZE
		if (enemy.pos.x + w > levelPixelWidth) {
			enemy.pos.x = levelPixelWidth - w
			enemy.vel.x = -Math.abs(enemy.vel.x)
			enemy.facing = 'left'
		}
	}
}

// ─── Mario–Enemy collision ────────────────────────────────────────────────────

/**
 * Check Mario against each live enemy.
 *
 * Stomp detection (from above):
 *   - Mario's vel.y > 0 (falling) AND Mario's feet are at or above the
 *     enemy's vertical midpoint when the AABBs overlap.
 *   - Sets enemy.state = 'stomped', enemy.hp = 0
 *   - Bounces Mario upward (STOMP_BOUNCE_VY)
 *   - Awards SCORE.GOOMBA_STOMP points
 *
 * Side / head hit:
 *   - If mario.starTimer > 0 → star-kill the enemy (same as stomp)
 *   - If mario.powerUp === 'small' → mario.state = 'dead'
 *   - Otherwise → downgrade power-up, mario.state = 'invincible',
 *     mario.hurtTimer = HURT_INVINCIBLE_FRAMES
 */
export function checkMarioEnemyCollisions(state: GameState): void {
	const mario = state.player
	if (mario.state === 'dead' || mario.state === 'dying') return
	if (mario.hurtTimer > 0) return

	const mAABB = marioAABB(mario)

	for (const enemy of state.enemies) {
		if (enemy.state === 'dead' || enemy.state === 'stomped') continue

		const eSize = ENEMY_SIZE[enemy.type] ?? { w: 14, h: 14 }
		const eAABB = entityAABB(enemy.pos, eSize.w, eSize.h)

		if (!overlaps(mAABB, eAABB)) continue

		// Stomp = Mario falling, feet at/above enemy mid-point
		const marioFeet = mario.pos.y + MARIO_SIZE[mario.powerUp].h
		const enemyMid = enemy.pos.y + eSize.h * 0.5
		const isStomp =
			enemy.stompable && mario.vel.y > 0 && marioFeet <= enemyMid + 4

		if (isStomp || mario.starTimer > 0) {
			enemy.state = 'stomped'
			enemy.hp = 0
			mario.vel.y = STOMP_BOUNCE_VY
			state.hud.score += SCORE.GOOMBA_STOMP
		} else {
			// Side hit
			if (mario.powerUp === 'small') {
				mario.state = 'dead'
			} else {
				// Downgrade power-up one step
				if (mario.powerUp === 'fire' || mario.powerUp === 'cape') {
					mario.powerUp = 'super'
				} else {
					mario.powerUp = 'small'
				}
				mario.state = 'invincible'
				mario.hurtTimer = HURT_INVINCIBLE_FRAMES
			}
		}
	}
}

// ─── Coin collection ──────────────────────────────────────────────────────────

/**
 * Check Mario's AABB against every COIN tile (type 8) in the level.
 * On collection:
 *   - Tile replaced with AIR (0)
 *   - state.hud.coins incremented
 *   - Every SCORE.EXTRA_LIFE_THRESHOLD coins grants +1 life and resets coin count
 *   - SCORE.COIN added to state.hud.score
 */
export function checkCoinCollection(state: GameState, level: LevelData): void {
	const mario = state.player
	const mAABB = marioAABB(mario)

	const c0 = tileCol(mAABB.x)
	const c1 = tileCol(mAABB.x + mAABB.w - 1)
	const r0 = tileRow(mAABB.y)
	const r1 = tileRow(mAABB.y + mAABB.h - 1)

	for (let row = r0; row <= r1; row++) {
		for (let col = c0; col <= c1; col++) {
			const tile = getTile(level, col, row)
			if (!isCollectible(tile)) continue

			const coinAABB: AABB = {
				x: col * TILE_SIZE,
				y: row * TILE_SIZE,
				w: TILE_SIZE,
				h: TILE_SIZE,
			}
			if (!overlaps(mAABB, coinAABB)) continue

			// Remove coin tile
			level.tiles[row][col] = 0 // AIR

			state.hud.coins += 1
			state.hud.score += SCORE.COIN

			if (state.hud.coins >= SCORE.EXTRA_LIFE_THRESHOLD) {
				state.hud.coins -= SCORE.EXTRA_LIFE_THRESHOLD
				state.hud.lives += 1
			}
		}
	}
}

// ─── Block hit ────────────────────────────────────────────────────────────────

/**
 * Check whether Mario hit an interactive block from below (vel.y < 0,
 * Mario's head entering a tile's pixel bounds).
 *
 * QUESTION_BLOCK (4):
 *   - Converted to USED_BLOCK (5)
 *   - Awards a coin (SCORE.COIN, increments hud.coins; extra life at 100)
 *
 * BRICK (6):
 *   - If Mario is Super/Fire/Cape: block destroyed (→ AIR, +50 score)
 *   - If small: block stays, Mario is just bounced
 *
 * Mutates level.tiles in place.
 */
export function checkBlockHit(state: GameState, level: LevelData): void {
	const mario = state.player
	if (mario.vel.y >= 0) return // only when rising

	const size = MARIO_SIZE[mario.powerUp]
	const headY = mario.pos.y
	const headRow = tileRow(headY)
	const c0 = tileCol(mario.pos.x + 1)
	const c1 = tileCol(mario.pos.x + size.w - 2)

	for (let col = c0; col <= c1; col++) {
		const tile = getTile(level, col, headRow)
		if (!isInteractive(tile)) continue

		const tileTop = headRow * TILE_SIZE
		const tileBot = tileTop + TILE_SIZE
		if (headY < tileTop || headY >= tileBot) continue

		// Bounce Mario's upward velocity slightly
		mario.vel.y = Math.abs(mario.vel.y) * 0.3

		if (tile === 4 /* QUESTION_BLOCK */) {
			level.tiles[headRow][col] = 5 // USED_BLOCK
			state.hud.coins += 1
			state.hud.score += SCORE.COIN
			if (state.hud.coins >= SCORE.EXTRA_LIFE_THRESHOLD) {
				state.hud.coins -= SCORE.EXTRA_LIFE_THRESHOLD
				state.hud.lives += 1
			}
		} else if (tile === 6 /* BRICK */) {
			if (mario.powerUp !== 'small') {
				level.tiles[headRow][col] = 0 // AIR
				state.hud.score += 50
			}
			// Small Mario: block stays, just bounced
		}
	}
}

// ─── Flagpole ─────────────────────────────────────────────────────────────────

/**
 * Check whether Mario has reached the goal flagpole tile (GOAL_POLE = 17).
 * Awards a time bonus, sets state.screen = 'levelComplete', returns true.
 * Returns false if the flagpole has not been touched.
 */
export function checkFlagpole(state: GameState, level: LevelData): boolean {
	const mario = state.player
	const mAABB = marioAABB(mario)

	const c0 = tileCol(mAABB.x)
	const c1 = tileCol(mAABB.x + mAABB.w - 1)
	const r0 = tileRow(mAABB.y)
	const r1 = tileRow(mAABB.y + mAABB.h - 1)

	for (let row = r0; row <= r1; row++) {
		for (let col = c0; col <= c1; col++) {
			if (getTile(level, col, row) === 17 /* GOAL_POLE */) {
				state.hud.score +=
					state.hud.timeRemaining * SCORE.TIME_BONUS_PER_SEC
				state.hud.timeRemaining = 0
				state.screen = 'levelComplete'
				return true
			}
		}
	}
	return false
}
