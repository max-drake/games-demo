/**
 * marioConstants.ts
 * Shared numeric and string constants for the Super Mario World game module.
 * No logic, no rendering — numbers and readonly data only.
 */

import type { HUD, InputState, PowerUpState, KoopaColor } from './marioTypes'

// ─── Canvas / Viewport ───────────────────────────────────────────────────────

/** Width of the game canvas in pixels. */
export const CANVAS_W = 800

/** Height of the game canvas in pixels. */
export const CANVAS_H = 448   // 28 tiles × 16 px (NES/SNES aspect)

// ─── Tile Grid ────────────────────────────────────────────────────────────────

/** Width and height of a single tile in pixels. */
export const TILE_SIZE = 16   // px

/** Number of tile columns visible on screen. */
export const VISIBLE_COLS = Math.ceil(CANVAS_W / TILE_SIZE)   // 50

/** Number of tile rows visible on screen. */
export const VISIBLE_ROWS = Math.ceil(CANVAS_H / TILE_SIZE)   // 28

// ─── Physics ─────────────────────────────────────────────────────────────────

/** Downward acceleration applied every frame (pixels/frame²). */
export const GRAVITY = 0.45

/** Maximum downward velocity Mario can reach (px/frame). */
export const MAX_FALL_SPEED = 8

/** Maximum downward speed in water (px/frame). */
export const MAX_FALL_SPEED_WATER = 3

/** Walking speed (px/frame). */
export const WALK_SPEED = 2.5

/** Running speed (px/frame) — achieved while holding the run button. */
export const RUN_SPEED = 5

/** Speed cap when carrying a shell (px/frame). */
export const CARRY_SPEED = 3

/** Initial upward velocity when jumping (negative = up). */
export const JUMP_VELOCITY = -9.5

/** Reduced jump velocity for a short hop (button released early). */
export const SHORT_HOP_VELOCITY = -6

/** Velocity boost when jumping while running at full speed. */
export const RUNNING_JUMP_VELOCITY = -11

/** Swimming float / paddle velocity (px/frame, upward). */
export const SWIM_PADDLE_VELOCITY = -4

/** Horizontal deceleration (friction) when on the ground (px/frame²). */
export const GROUND_FRICTION = 0.3

/** Air resistance applied to horizontal velocity (multiplied per frame). */
export const AIR_RESISTANCE = 0.92

/** Velocity at which skidding begins (player holding opposite direction). */
export const SKID_THRESHOLD = 2.5

/** Max consecutive frames the jump button can extend the jump. */
export const JUMP_HOLD_FRAMES = 10

// ─── Player Sprite Dimensions ────────────────────────────────────────────────

/** Hitbox width for Small Mario (px). */
export const MARIO_SMALL_W = 12

/** Hitbox height for Small Mario (px). */
export const MARIO_SMALL_H = 16

/** Hitbox width for Super / Fire / Cape Mario (px). */
export const MARIO_SUPER_W = 14

/** Hitbox height for Super / Fire / Cape Mario (px). */
export const MARIO_SUPER_H = 32

/** Crouching height for Super Mario (px). */
export const MARIO_CROUCH_H = 16

// ─── Player Timers ───────────────────────────────────────────────────────────

/** Frames Mario is invincible after taking damage. */
export const HURT_INVINCIBLE_FRAMES = 120

/** Duration of star (Starman) invincibility in frames. */
export const STAR_INVINCIBLE_FRAMES = 600   // ~10 s at 60 fps

/** Frames it takes to grow from small to super after collecting mushroom. */
export const GROW_ANIMATION_FRAMES = 30

/** Frames of the death animation before respawning. */
export const DEATH_ANIMATION_FRAMES = 90

/** Frames between fireball shots (fire cooldown). */
export const FIREBALL_COOLDOWN_FRAMES = 20

// ─── Enemy Dimensions & Behaviour ────────────────────────────────────────────

/** Width of a Goomba hitbox (px). */
export const GOOMBA_W = 14

/** Height of a Goomba hitbox (px). */
export const GOOMBA_H = 14

/** Walking speed of a Goomba (px/frame). */
export const GOOMBA_SPEED = 1

/** Width of a Koopa Troopa hitbox (px). */
export const KOOPA_W = 12

/** Height of a Koopa Troopa hitbox (px). */
export const KOOPA_H = 24

/** Walking speed of a Koopa Troopa (px/frame). */
export const KOOPA_WALK_SPEED = 0.8

/** Speed of a kicked Koopa shell (px/frame). */
export const KOOPA_SHELL_SPEED = 7

/** Frames a Koopa stays stunned in its shell before waking up. */
export const KOOPA_SHELL_WAKE_FRAMES = 360   // 6 s

/** Bullet Bill horizontal speed (px/frame). */
export const BULLET_SPEED = 3

/** Boo movement speed (px/frame). */
export const BOO_SPEED = 1.2

/** Thwomp fall speed once triggered (px/frame). */
export const THWOMP_FALL_SPEED = 6

/** Thwomp rise speed (px/frame). */
export const THWOMP_RISE_SPEED = 0.5

/** Frames the Thwomp pauses at the bottom before rising. */
export const THWOMP_PAUSE_FRAMES = 90

// ─── Projectiles ─────────────────────────────────────────────────────────────

/** Width of a fireball hitbox (px). */
export const FIREBALL_W = 8

/** Height of a fireball hitbox (px). */
export const FIREBALL_H = 8

/** Initial horizontal speed of a fireball (px/frame). */
export const FIREBALL_SPEED_X = 5

/** Fireball bounce velocity (px/frame, upward). */
export const FIREBALL_BOUNCE_VY = -5

/** Maximum frames a fireball can live before being removed. */
export const FIREBALL_MAX_LIFETIME = 240   // 4 s

// ─── Scoring ─────────────────────────────────────────────────────────────────

/** Points awarded for each event. */
export const SCORE = {
	COIN: 200,
	GOOMBA_STOMP: 100,
	KOOPA_STOMP: 100,
	SHELL_KILL: 200,
	/** Multiplied for each consecutive stomp mid-air. */
	MULTI_STOMP_BASE: 100,
	STAR_KILL: 100,
	FIREBALL_KILL: 200,
	LEVEL_COMPLETE_BASE: 500,
	/** Per second remaining on the clock at level end. */
	TIME_BONUS_PER_SEC: 50,
	/** Bonus for riding Yoshi to the goal. */
	YOSHI_BONUS: 1000,
	/** Coins needed for a 1-UP. */
	EXTRA_LIFE_THRESHOLD: 100,
} as const

/** Score awarded for each stomp in an airborne stomp chain. */
export const STOMP_CHAIN_SCORES: readonly number[] = [
	100, 200, 400, 800, 1000, 2000, 4000, 8000,
] as const

// ─── HUD / Timing ────────────────────────────────────────────────────────────

/** Target frames per second (used for timer math). */
export const TARGET_FPS = 60

/** Time step in milliseconds (used with requestAnimationFrame accumulator). */
export const TICK_MS = 1000 / TARGET_FPS   // ~16.67 ms

/** Default level time limit (seconds). */
export const DEFAULT_TIME_LIMIT = 400

/** Number of lives Mario starts with on a new game. */
export const STARTING_LIVES = 3

/** Default HUD values at the start of a new game. */
export const INITIAL_HUD: Readonly<HUD> = {
	score: 0,
	coins: 0,
	lives: STARTING_LIVES,
	world: '1-1',
	timeRemaining: DEFAULT_TIME_LIMIT,
} as const

// ─── World Map ────────────────────────────────────────────────────────────────

/** Total number of worlds in the game. */
export const WORLD_COUNT = 7

/** Levels per world (most worlds). */
export const LEVELS_PER_WORLD = 4

// ─── Camera ──────────────────────────────────────────────────────────────────

/** Horizontal offset from the left edge of the screen where Mario is
 *  horizontally centered while the camera follows (px). */
export const CAMERA_X_MARGIN = CANVAS_W * 0.4

/** How quickly the camera y-axis lerps to the target position (0-1). */
export const CAMERA_Y_LERP = 0.1

// ─── Power-Up Sizes ──────────────────────────────────────────────────────────

/** Hitbox dimensions per power-up state. */
export const MARIO_SIZE: Readonly<
	Record<PowerUpState, { w: number; h: number; crouchH: number }>
> = {
	small: { w: MARIO_SMALL_W, h: MARIO_SMALL_H, crouchH: MARIO_SMALL_H },
	super: { w: MARIO_SUPER_W, h: MARIO_SUPER_H, crouchH: MARIO_CROUCH_H },
	fire:  { w: MARIO_SUPER_W, h: MARIO_SUPER_H, crouchH: MARIO_CROUCH_H },
	cape:  { w: MARIO_SUPER_W, h: MARIO_SUPER_H, crouchH: MARIO_CROUCH_H },
} as const

// ─── Yoshi ────────────────────────────────────────────────────────────────────

/** Yoshi hitbox width (px). */
export const YOSHI_W = 24

/** Yoshi hitbox height (px). */
export const YOSHI_H = 28

/** Yoshi walk speed (px/frame). */
export const YOSHI_WALK_SPEED = WALK_SPEED

/** Yoshi run speed (px/frame). */
export const YOSHI_RUN_SPEED = RUN_SPEED + 1

/** Frames Yoshi's tongue extends before retracting. */
export const YOSHI_TONGUE_EXTEND_FRAMES = 8

/** Frames Yoshi's tongue retracts. */
export const YOSHI_TONGUE_RETRACT_FRAMES = 8

/** Pixel length of Yoshi's fully extended tongue. */
export const YOSHI_TONGUE_LENGTH = 40

/** Number of times Yoshi can be hit before running away. */
export const YOSHI_HP = 1

/** Special abilities Yoshi gains from eating each shell color. */
export const YOSHI_SHELL_ABILITY: Readonly<Record<KoopaColor, string>> = {
	green:  'none',
	red:    'fireball',
	blue:   'fly',
	yellow: 'groundPound',
} as const

// ─── Colors (CSS strings used by the renderer) ───────────────────────────────

export const COLORS = {
	BG_PLAINS:      '#6b88fe',
	BG_UNDERGROUND: '#000000',
	BG_CASTLE:      '#000000',
	BG_GHOST:       '#2d2d2d',
	BG_WATER:       '#2048a0',
	BG_SKY:         '#87ceeb',

	TILE_SOLID:     '#8b5e3c',
	TILE_BRICK:     '#c84010',
	TILE_QUESTION:  '#f8b800',
	TILE_USED:      '#786040',
	TILE_PIPE:      '#00a800',
	TILE_COIN:      '#f8d000',

	MARIO_SKIN:     '#f8c090',
	MARIO_HAT:      '#c00000',
	MARIO_SHIRT:    '#c00000',
	MARIO_OVERALLS: '#0000c0',

	ENEMY_GOOMBA:   '#a05000',
	ENEMY_KOOPA:    '#00a800',
	ENEMY_BULLET:   '#303030',

	STAR:           '#f8d000',
	FIREBALL:       '#ff6010',
	HUD_TEXT:       '#ffffff',
	DANGER:         '#ff0000',
} as const

// ─── Key Bindings (default keyboard mapping) ─────────────────────────────────

/** Default keyboard-to-action mapping (KeyboardEvent.code values). */
export const DEFAULT_KEY_MAP: Readonly<Record<keyof InputState, readonly string[]>> = {
	left:  ['ArrowLeft',  'KeyA'],
	right: ['ArrowRight', 'KeyD'],
	up:    ['ArrowUp',    'KeyW'],
	down:  ['ArrowDown',  'KeyS'],
	jump:  ['Space', 'ArrowUp', 'KeyW'],
	run:   ['ShiftLeft', 'ShiftRight', 'KeyZ', 'KeyX'],
	start: ['Enter', 'Escape'],
} as const

// ─── Z-index / Draw-Order Layers ──────────────────────────────────────────────

/** Draw-order constants (lower = drawn first / behind). */
export const LAYER = {
	BACKGROUND:    0,
	TILES_BACK:    1,
	ENEMIES_BACK:  2,
	PLAYER:        3,
	ENEMIES_FRONT: 4,
	TILES_FRONT:   5,
	PARTICLES:     6,
	HUD:           7,
} as const
