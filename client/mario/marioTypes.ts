/**
 * marioTypes.ts
 * Shared TypeScript type definitions for the Super Mario World game module.
 * No logic, no rendering — types and interfaces only.
 */

// ─── Primitive / Enum-like Types ─────────────────────────────────────────────

/** Cardinal / compound directions used for movement and facing. */
export type Direction = 'left' | 'right'

/** Every named tile variant that can appear in a level. */
export type TileType =
	| 'empty'
	| 'solid'       // generic solid ground / platform
	| 'semisolid'   // pass-through platform (jump up through, land on top)
	| 'brick'       // breakable brick (Mario can punch/break when big)
	| 'questionBlock' // ? block (contains an item)
	| 'usedBlock'   // depleted ? block or smashed brick remnant
	| 'pipe'        // pipe segment (top or body)
	| 'pipeTop'     // top cap of a pipe (spawns enemies, warp)
	| 'coin'        // collectible coin tile
	| 'lava'        // instant-death hazard
	| 'water'       // swimming zone
	| 'vine'        // climbable vine
	| 'slope'       // diagonal slope tile
	| 'goalTape'    // level-end goal tape

/** Every type of item that can be held inside a block or obtained by Mario. */
export type ItemType =
	| 'coin'
	| 'superMushroom'  // Small -> Super
	| 'fireFlower'     // grants FireMario power-up
	| 'capeFeather'    // grants Cape power-up
	| 'starman'        // temporary invincibility
	| '1up'            // extra life mushroom
	| 'yoshiEgg'       // hatches Yoshi

/** Mario's current power-up state. */
export type PowerUpState = 'small' | 'super' | 'fire' | 'cape'

/** The status of an enemy entity. */
export type EnemyState =
	| 'walking'
	| 'turning'    // reversing direction this frame
	| 'stomped'    // flattened after player jump (brief before removal)
	| 'kicked'     // shell sliding at speed
	| 'airborne'   // knocked into the air
	| 'dead'

/** All enemy species used in the game. */
export type EnemyType =
	| 'goomba'
	| 'koopaTroopa'
	| 'koopaShell'
	| 'piranhPlant'
	| 'bullet'        // Bullet Bill
	| 'rex'
	| 'boo'
	| 'thwomp'
	| 'bob-omb'
	| 'cheepCheep'
	| 'lakitu'
	| 'spiny'

/** High-level screen / game flow state. */
export type GameScreen =
	| 'title'
	| 'worldMap'
	| 'playing'
	| 'paused'
	| 'levelComplete'
	| 'gameOver'
	| 'loading'

/** Possible states for the player character within a level. */
export type PlayerState =
	| 'idle'
	| 'walking'
	| 'running'
	| 'jumping'
	| 'falling'
	| 'spinning'     // cape spin / fire-spin
	| 'swimming'
	| 'climbing'
	| 'crouching'
	| 'skidding'
	| 'carrying'     // holding a shell / item
	| 'riding'       // on Yoshi
	| 'invincible'   // star power
	| 'dying'
	| 'dead'

// ─── Geometry ────────────────────────────────────────────────────────────────

/** A 2-D point or size in pixel space. */
export interface Vec2 {
	x: number
	y: number
}

/** Axis-aligned bounding box (pixel-space). */
export interface AABB {
	x: number  // left edge
	y: number  // top edge
	w: number  // width
	h: number  // height
}

// ─── World / Level ────────────────────────────────────────────────────────────

/** A single tile in the level grid. */
export interface Tile {
	type: TileType
	/** Tile-grid column index (0 = left-most). */
	col: number
	/** Tile-grid row index (0 = top-most). */
	row: number
	/** Optional item contained in a questionBlock or brick. */
	item?: ItemType
	/** For slopes: incline direction. */
	slopeDir?: Direction
}

/** Metadata describing a level. */
export interface LevelMeta {
	id: string
	world: number   // 1-based world number
	level: number   // 1-based level number within the world
	name: string
	theme: LevelTheme
	/** Width of the level in tiles. */
	widthTiles: number
	/** Height of the level in tiles. */
	heightTiles: number
	/** Whether the level has a time limit. */
	timeLimit: number  // seconds; 0 = no limit
}

/** Visual / environmental theme of a level. */
export type LevelTheme =
	| 'plains'
	| 'underground'
	| 'castle'
	| 'ghost'
	| 'water'
	| 'forest'
	| 'sky'
	| 'snow'
	| 'volcanic'

/** Complete level data: tiles + spawn info. */
export interface Level {
	meta: LevelMeta
	/** Flat row-major tile array (row * widthTiles + col). */
	tiles: Tile[]
	playerSpawn: Vec2  // pixel position
	enemySpawns: EnemySpawn[]
	itemSpawns: ItemSpawn[]
	/** Goal position (pixel x of the goal tape post). */
	goalX: number
}

/** Describes an enemy that should be created at level start. */
export interface EnemySpawn {
	type: EnemyType
	/** Pixel spawn position. */
	x: number
	y: number
	/** Which direction the enemy initially faces. */
	facing: Direction
}

/** Describes a loose item (e.g. moving coin, bonus star) placed in the world. */
export interface ItemSpawn {
	type: ItemType
	x: number
	y: number
}

// ─── Entities ────────────────────────────────────────────────────────────────

/** Koopa Troopa shell color — affects Yoshi's fire/fly/etc. ability. */
export type KoopaColor = 'green' | 'red' | 'blue' | 'yellow'

/** An enemy entity. */
export interface Enemy {
	id: number
	type: EnemyType
	pos: Vec2
	vel: Vec2
	facing: Direction
	state: EnemyState
	/** Frames until this enemy is removed (used during dying animation). */
	despawnTimer: number
	/** Whether this enemy can be stomped (some, e.g. spiny, cannot). */
	stompable: boolean
	/** Whether this enemy is carried / was kicked (shell). */
	isShell: boolean
	/** Hit-points remaining (most enemies have 1). */
	hp: number
}

/** Yoshi. */
export interface Yoshi {
	id: number
	pos: Vec2
	vel: Vec2
	facing: Direction
	/** Whether Yoshi has a Koopa in his mouth. */
	hasShell: boolean
	/** Color of the Koopa shell in Yoshi's mouth, if any. */
	shellColor: KoopaColor | null
	/** Frames left on Yoshi's tongue extension. */
	tongueTimer: number
}

/** The player (Mario). */
export interface Player {
	/** Pixel position (center-bottom of sprite). */
	pos: Vec2
	/** Velocity in pixels per frame. */
	vel: Vec2
	facing: Direction
	state: PlayerState
	powerUp: PowerUpState
	/** Frames remaining of star invincibility (0 = normal). */
	starTimer: number
	/** Frames remaining of damage-flash invincibility. */
	hurtTimer: number
	/** Whether Mario is currently on the ground. */
	grounded: boolean
	/** Whether Mario is touching a wall (for wall-jump). */
	onWall: boolean
	/** Whether Mario is in water. */
	inWater: boolean
	/** Yoshi that Mario is currently riding, or null. */
	yoshi: Yoshi | null
	/** Item Mario is currently carrying (shell etc.), or null. */
	carrying: Enemy | null
}

/** A fireball or other projectile shot by Mario or an enemy. */
export interface Projectile {
	id: number
	/** Origin: 'player' or an enemy id. */
	ownerType: 'player' | 'enemy'
	ownerId: number
	pos: Vec2
	vel: Vec2
	/** Frames until auto-removal. */
	lifetime: number
}

/** A coin or score popup that floats upward after collection. */
export interface FloatingScore {
	id: number
	value: number
	pos: Vec2
	/** Frames remaining before removal. */
	timer: number
}

/** A spinning coin or collected item flying toward the HUD. */
export interface CollectedItem {
	id: number
	type: ItemType
	pos: Vec2
	vel: Vec2
}

// ─── Camera ──────────────────────────────────────────────────────────────────

/** Tracks the viewport scroll within the level. */
export interface Camera {
	/** Pixel offset of the left edge of the viewport in the level. */
	x: number
	/** Pixel offset of the top edge of the viewport in the level. */
	y: number
}

// ─── HUD / Persistent State ──────────────────────────────────────────────────

/** Counters shown in the HUD. */
export interface HUD {
	score: number
	coins: number
	lives: number
	world: string   // e.g. "1-1"
	timeRemaining: number  // seconds
}

/** Save data persisted across sessions (localStorage). */
export interface SaveData {
	lives: number
	score: number
	coins: number
	/** Worlds/levels unlocked on the map screen. */
	unlockedLevels: string[]  // level ids
}

// ─── Input ───────────────────────────────────────────────────────────────────

/** Snapshot of which buttons are currently pressed. */
export interface InputState {
	left: boolean
	right: boolean
	up: boolean
	down: boolean
	/** Jump button. */
	jump: boolean
	/** Run / fire button. */
	run: boolean
	/** Start / pause. */
	start: boolean
}

// ─── Full Game State ──────────────────────────────────────────────────────────

/** Complete runtime game state for one play session. */
export interface GameState {
	screen: GameScreen
	hud: HUD
	/** Level currently loaded (null when on world map / title). */
	level: Level | null
	player: Player
	enemies: Enemy[]
	projectiles: Projectile[]
	floatingScores: FloatingScore[]
	collectedItems: CollectedItem[]
	camera: Camera
	/** Total frames elapsed since the level started. */
	tick: number
	/** Whether the game loop should be running. */
	paused: boolean
}
