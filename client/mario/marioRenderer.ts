/**
 * marioRenderer.ts
 *
 * Pixel-art canvas draw functions for every visual element of Super Mario World.
 * This module exports a single `drawFrame` function that takes a CanvasRenderingContext2D
 * and a MarioGameState and draws one complete frame.
 *
 * All pixel art is drawn with fillRect calls at integer coordinates so that
 * any canvas scale (via ctx.scale) produces crisp pixel art.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

export const PAL = {
  SKY: '#5c94fc',
  SKY_DARK: '#2038ec',
  GROUND_TOP: '#e0a000',
  GROUND_FILL: '#a06000',
  GROUND_SHADOW: '#7c4800',
  GRASS: '#00d800',
  GRASS_DARK: '#007800',
  BRICK_LIGHT: '#e87040',
  BRICK_MID: '#c04820',
  BRICK_DARK: '#803000',
  BRICK_JOINT: '#7c3800',
  QMARK_YELLOW: '#fce000',
  QMARK_ORANGE: '#e07018',
  QMARK_DARK: '#a03000',
  QMARK_SHINE: '#ffffff',
  COIN_GOLD: '#fce000',
  COIN_SHINE: '#ffffffcc',
  MARIO_SKIN: '#fca880',
  MARIO_RED: '#e80000',
  MARIO_RED_DARK: '#b80000',
  MARIO_BLUE: '#0000e8',
  MARIO_BLUE_DARK: '#0000a0',
  MARIO_HAIR: '#7c4800',
  MARIO_SHOE: '#7c4800',
  CAPE_YELLOW: '#f8c000',
  CAPE_SHADOW: '#a06000',
  GOOMBA_BROWN: '#a05000',
  GOOMBA_DARK: '#703000',
  GOOMBA_FEET: '#603000',
  GOOMBA_EYE: '#000000',
  KOOPA_GREEN: '#00b800',
  KOOPA_GREEN_DARK: '#007800',
  KOOPA_SHELL: '#00d800',
  KOOPA_SKIN: '#fce000',
  KOOPA_EYE: '#000000',
  KOOPA_SHOE: '#e07018',
  PLANT_GREEN: '#00a800',
  PLANT_STEM: '#00d800',
  PLANT_WHITE: '#f8f8f8',
  PLANT_RED: '#d80000',
  YOSHI_GREEN: '#00c800',
  YOSHI_DARK: '#007800',
  YOSHI_SADDLE: '#e07018',
  YOSHI_EYE: '#000000',
  YOSHI_TONGUE: '#ff8080',
  YOSHI_BOOT: '#e07018',
  FLOWER_RED: '#e80000',
  FLOWER_WHITE: '#f8f8f8',
  FLOWER_STEM: '#00a800',
  FLOWER_LEAF: '#00d800',
  STAR_YELLOW: '#fce000',
  STAR_WHITE: '#ffffff',
  PIPE_GREEN: '#00a800',
  PIPE_GREEN_LIGHT: '#00d800',
  PIPE_GREEN_DARK: '#004800',
  PIPE_RIM_LIGHT: '#00f800',
  FLAGPOLE: '#d0d0d0',
  FLAG_GREEN: '#00d800',
  CASTLE_GREY: '#b0b0b0',
  CASTLE_DARK: '#686868',
  CASTLE_WINDOW: '#000080',
  HUD_TEXT: '#ffffff',
  HUD_SHADOW: '#000000',
  HUD_LIVES: '#f8d018',
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type Direction = 'left' | 'right'
export type MarioForm = 'small' | 'big' | 'cape' | 'fire'
export type EnemyKind = 'goomba' | 'koopa' | 'piranha' | 'koopa_shell'
export type PowerUpKind = 'mushroom' | 'fire_flower' | 'cape' | 'star' | 'coin'
export type TileKind = 'ground' | 'brick' | 'qmark' | 'qmark_used' | 'pipe_body' | 'pipe_top' | 'castle' | 'cloud' | 'hill'

export interface Tile {
  kind: TileKind
  x: number
  y: number
  w?: number
  h?: number
}

export interface Enemy {
  kind: EnemyKind
  x: number
  y: number
  frame: number
  dir: Direction
  stomped?: boolean
}

export interface PowerUp {
  kind: PowerUpKind
  x: number
  y: number
  frame: number
}

export interface ScoreParticle {
  x: number
  y: number
  value: number
  alpha: number
}

export interface YoshiState {
  x: number
  y: number
  dir: Direction
  frame: number
  tonguePx: number
}

export interface MarioState {
  x: number
  y: number
  dir: Direction
  form: MarioForm
  frame: number
  jumping: boolean
  running: boolean
  invincible: number
  onYoshi: boolean
}

export interface MarioGameState {
  cameraX: number
  cameraY: number
  skyColor?: string
  tiles: Tile[]
  enemies: Enemy[]
  powerUps: PowerUp[]
  particles: ScoreParticle[]
  mario: MarioState
  yoshi?: YoshiState | null
  score: number
  coins: number
  lives: number
  time: number
  level: string
  phase: 'playing' | 'gameover' | 'levelclear' | 'title'
  tick: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TILE = 16

// ─── Helpers ─────────────────────────────────────────────────────────────────

function px(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number, y: number, w: number, h: number
) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function dot(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, s = 1) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, s, s)
}

// ─── Background ──────────────────────────────────────────────────────────────

export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skyColor?: string
) {
  ctx.fillStyle = skyColor ?? PAL.SKY
  ctx.fillRect(0, 0, w, h)
}

export function drawCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale = 1
) {
  const s = scale
  px(ctx, '#ffffff', cx,           cy + 8 * s, 16 * s, 8 * s)
  px(ctx, '#ffffff', cx + 2 * s,   cy + 4 * s, 12 * s, 8 * s)
  px(ctx, '#ffffff', cx + 4 * s,   cy,          8 * s, 8 * s)
  px(ctx, '#d0d0d0', cx + 12 * s,  cy + 8 * s,  4 * s, 4 * s)
  px(ctx, '#d0d0d0', cx + 10 * s,  cy + 4 * s,  4 * s, 4 * s)
}

export function drawHill(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  scale = 1
) {
  const s = scale
  const rows = [
    { dy: 12 * s, w: 32 * s },
    { dy:  8 * s, w: 28 * s },
    { dy:  4 * s, w: 20 * s },
    { dy:  0,     w: 12 * s },
  ]
  for (const row of rows) {
    px(ctx, PAL.GRASS,      hx + (32 * s - row.w) / 2, hy + row.dy, row.w,     4 * s)
    px(ctx, PAL.GRASS_DARK, hx + (32 * s - row.w) / 2, hy + row.dy, 2 * s,     4 * s)
  }
  dot(ctx, PAL.GRASS_DARK, hx + 6 * s,  hy + 10 * s, 2 * s)
  dot(ctx, PAL.GRASS_DARK, hx + 18 * s, hy + 6 * s,  2 * s)
  dot(ctx, PAL.GRASS_DARK, hx + 22 * s, hy + 10 * s, 2 * s)
}

// ─── Tiles ───────────────────────────────────────────────────────────────────

export function drawGroundTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isTop = true
) {
  px(ctx, PAL.GROUND_FILL, x, y, TILE, TILE)
  if (isTop) {
    px(ctx, PAL.GRASS,      x, y,     TILE, 2)
    px(ctx, PAL.GRASS_DARK, x, y + 2, TILE, 1)
  }
  px(ctx, PAL.GROUND_TOP,    x,          y + (isTop ? 3 : 0), 1, TILE - (isTop ? 3 : 0))
  px(ctx, PAL.GROUND_TOP,    x,          y,                    TILE, 1)
  px(ctx, PAL.GROUND_SHADOW, x + TILE - 1, y,              1, TILE)
  px(ctx, PAL.GROUND_SHADOW, x,            y + TILE - 1, TILE,    1)
}

export function drawBrickTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  px(ctx, PAL.BRICK_MID,   x,      y,      TILE, TILE)
  px(ctx, PAL.BRICK_JOINT, x,      y + 7,  TILE, 2)
  px(ctx, PAL.BRICK_JOINT, x + 7,  y,      2,    7)
  px(ctx, PAL.BRICK_JOINT, x + 3,  y + 9,  2,    7)
  px(ctx, PAL.BRICK_JOINT, x + 11, y + 9,  2,    7)
  px(ctx, PAL.BRICK_LIGHT, x,      y,      7,    2)
  px(ctx, PAL.BRICK_LIGHT, x,      y,      2,    7)
  px(ctx, PAL.BRICK_LIGHT, x + 9,  y,      7,    2)
  px(ctx, PAL.BRICK_LIGHT, x + 9,  y,      2,    7)
  px(ctx, PAL.BRICK_LIGHT, x,      y + 9,  4,    2)
  px(ctx, PAL.BRICK_LIGHT, x,      y + 9,  2,    7)
  px(ctx, PAL.BRICK_LIGHT, x + 13, y + 9,  3,    2)
  px(ctx, PAL.BRICK_LIGHT, x + 13, y + 9,  2,    7)
  px(ctx, PAL.BRICK_DARK,  x + 5,  y + 2,  2,    5)
  px(ctx, PAL.BRICK_DARK,  x + 13, y + 2,  2,    5)
  px(ctx, PAL.BRICK_DARK,  x + 1,  y + 11, 2,    5)
  px(ctx, PAL.BRICK_DARK,  x + 9,  y + 11, 2,    5)
}

export function drawQMarkTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  used = false,
  tick = 0
) {
  if (used) {
    px(ctx, '#989898', x, y, TILE, TILE)
    px(ctx, '#c0c0c0', x, y, TILE, 2)
    px(ctx, '#c0c0c0', x, y, 2, TILE)
    px(ctx, '#686868', x + TILE - 2, y, 2, TILE)
    px(ctx, '#686868', x, y + TILE - 2, TILE, 2)
    return
  }
  px(ctx, PAL.QMARK_YELLOW,  x, y, TILE, TILE)
  px(ctx, '#fce040',          x, y, TILE, 2)
  px(ctx, '#fce040',          x, y, 2, TILE)
  px(ctx, PAL.QMARK_DARK,    x + TILE - 2, y, 2, TILE)
  px(ctx, PAL.QMARK_DARK,    x, y + TILE - 2, TILE, 2)
  px(ctx, PAL.QMARK_ORANGE,  x + 2, y + 2, TILE - 4, TILE - 4)
  const shimmer = (tick >> 2) & 1
  const qx = x + 5
  const qy = y + 2 + shimmer
  const qc = PAL.QMARK_SHINE
  px(ctx, qc, qx,     qy,      6, 2)
  px(ctx, qc, qx + 4, qy + 2,  2, 2)
  px(ctx, qc, qx + 2, qy + 4,  2, 2)
  px(ctx, qc, qx + 2, qy + 6,  2, 2)
  px(ctx, qc, qx + 2, qy + 10, 2, 2)
}

export function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyH = 32
) {
  const rimH = 8
  const pipeW = 32
  const innerW = 24
  const innerX = x + 4
  px(ctx, PAL.PIPE_GREEN,       x - 2,              y,          pipeW + 4, rimH)
  px(ctx, PAL.PIPE_RIM_LIGHT,   x - 2,              y,          pipeW + 4, 2)
  px(ctx, PAL.PIPE_RIM_LIGHT,   x - 2,              y,          2,         rimH)
  px(ctx, PAL.PIPE_GREEN_DARK,  x + pipeW,          y,          4,         rimH)
  px(ctx, PAL.PIPE_GREEN_DARK,  x - 2,              y + rimH - 2, pipeW + 4, 2)
  px(ctx, PAL.PIPE_GREEN,       innerX,             y + rimH,   innerW,    bodyH)
  px(ctx, PAL.PIPE_GREEN_LIGHT, innerX,             y + rimH,   4,         bodyH)
  px(ctx, PAL.PIPE_GREEN_DARK,  innerX + innerW - 4, y + rimH,  4,         bodyH)
}

export function drawCastle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const W = 80
  const H = 64
  px(ctx, PAL.CASTLE_GREY, x,      y + 16, W, H - 16)
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) px(ctx, PAL.CASTLE_GREY, x + i * 16, y, 16, 16)
  }
  px(ctx, PAL.CASTLE_WINDOW, x + 28, y + 36, 24, 28)
  px(ctx, PAL.CASTLE_GREY,   x + 32, y + 36, 16, 4)
  px(ctx, PAL.CASTLE_WINDOW, x + 10, y + 28, 12, 12)
  px(ctx, PAL.CASTLE_WINDOW, x + 58, y + 28, 12, 12)
  px(ctx, PAL.FLAGPOLE,      x,      y + 16, 2,  H - 16)
  px(ctx, PAL.CASTLE_DARK,   x + W - 2, y + 16, 2, H - 16)
}

export function drawFlagPole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flagY = 8
) {
  px(ctx, '#808080',      x + 3, y,  2, 128)
  px(ctx, PAL.FLAGPOLE,   x + 4, y,  2, 128)
  ctx.fillStyle = PAL.FLAGPOLE
  ctx.beginPath()
  ctx.arc(x + 4, y, 4, 0, Math.PI * 2)
  ctx.fill()
  const fy = y + flagY
  px(ctx, PAL.FLAG_GREEN, x + 6, fy,      16, 12)
  px(ctx, '#00f800',      x + 6, fy,       16, 2)
  px(ctx, '#004800',      x + 6, fy + 10,  16, 2)
}

// ─── Mario ───────────────────────────────────────────────────────────────────

export function drawMarioSmall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction,
  frame: number
) {
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 8, 0)
    ctx.scale(-1, 1)
    lx = -8
  }
  switch (frame) {
    case 3:
      px(ctx, PAL.MARIO_RED,  lx + 2, y,      12, 4)
      px(ctx, PAL.MARIO_RED,  lx,     y + 2,   14, 4)
      px(ctx, PAL.MARIO_SKIN, lx + 2, y + 4,   12, 6)
      px(ctx, PAL.MARIO_HAIR, lx + 2, y + 4,    4, 2)
      dot(ctx, '#000000',     lx + 10, y + 5, 2)
      px(ctx, PAL.MARIO_HAIR, lx + 4, y + 8,    8, 2)
      px(ctx, PAL.MARIO_RED,      lx,     y + 10, 16, 4)
      px(ctx, PAL.MARIO_SKIN, lx,      y + 10,  4, 2)
      px(ctx, PAL.MARIO_SKIN, lx + 12, y + 10,  4, 2)
      px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 14,  4, 2)
      px(ctx, PAL.MARIO_BLUE, lx + 10, y + 14,  4, 2)
      px(ctx, PAL.MARIO_SHOE, lx,      y + 14,  4, 2)
      px(ctx, PAL.MARIO_SHOE, lx + 12, y + 14,  4, 2)
      break
    case 4:
      px(ctx, PAL.MARIO_RED,  lx + 2, y + 2,  12, 4)
      px(ctx, PAL.MARIO_SKIN, lx + 2, y + 6,  10, 4)
      dot(ctx, '#000000',     lx + 10, y + 7, 2)
      px(ctx, PAL.MARIO_HAIR, lx + 4,  y + 10,  6, 2)
      px(ctx, PAL.MARIO_RED,      lx + 2,  y + 12, 12, 4)
      px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 16,  4, 2)
      px(ctx, PAL.MARIO_SHOE, lx,      y + 16,  4, 2)
      break
    default: {
      px(ctx, PAL.MARIO_RED,  lx + 2, y,      10, 4)
      px(ctx, PAL.MARIO_RED,  lx,     y + 2,   14, 4)
      px(ctx, PAL.MARIO_HAIR, lx + 2, y + 4,    4, 2)
      px(ctx, PAL.MARIO_SKIN, lx + 2, y + 4,   12, 6)
      dot(ctx, '#000000',     lx + 10, y + 5, 2)
      px(ctx, PAL.MARIO_HAIR, lx + 4,  y + 8,   6, 2)
      px(ctx, PAL.MARIO_RED,      lx,      y + 10, 16, 6)
      px(ctx, PAL.MARIO_BLUE, lx + 4,  y + 10,  8, 6)
      px(ctx, PAL.MARIO_SKIN, lx,      y + 10,  4, 4)
      px(ctx, PAL.MARIO_SKIN, lx + 12, y + 10,  4, 4)
      if (frame === 1) {
        px(ctx, PAL.MARIO_BLUE, lx,      y + 16, 8, 4)
        px(ctx, PAL.MARIO_BLUE, lx + 10, y + 16, 6, 4)
        px(ctx, PAL.MARIO_SHOE, lx,      y + 18, 8, 2)
        px(ctx, PAL.MARIO_SHOE, lx + 10, y + 18, 6, 2)
      } else if (frame === 2) {
        px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 16, 6, 4)
        px(ctx, PAL.MARIO_BLUE, lx + 8,  y + 16, 8, 4)
        px(ctx, PAL.MARIO_SHOE, lx + 2,  y + 18, 6, 2)
        px(ctx, PAL.MARIO_SHOE, lx + 8,  y + 18, 8, 2)
      } else {
        px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 16, 12, 4)
        px(ctx, PAL.MARIO_SHOE, lx,      y + 18,  6, 2)
        px(ctx, PAL.MARIO_SHOE, lx + 10, y + 18,  6, 2)
      }
      break
    }
  }
  ctx.restore()
}

export function drawMarioBig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction,
  frame: number
) {
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 8, 0)
    ctx.scale(-1, 1)
    lx = -8
  }
  px(ctx, PAL.MARIO_RED,  lx + 2, y,      12, 4)
  px(ctx, PAL.MARIO_RED,  lx,     y + 2,   16, 4)
  px(ctx, PAL.MARIO_SKIN, lx + 2, y + 6,   12, 8)
  px(ctx, PAL.MARIO_HAIR, lx + 2, y + 6,    4, 4)
  dot(ctx, '#000000',     lx + 10, y + 9, 2)
  px(ctx, PAL.MARIO_HAIR, lx + 4,  y + 12,  8, 2)
  px(ctx, PAL.MARIO_SKIN, lx + 4,  y + 14,  8, 2)
  px(ctx, PAL.MARIO_RED,      lx,      y + 16, 16, 8)
  px(ctx, PAL.MARIO_BLUE, lx + 4,  y + 16,  8, 8)
  px(ctx, PAL.MARIO_SKIN, lx,      y + 16,  4, 6)
  px(ctx, PAL.MARIO_SKIN, lx + 12, y + 16,  4, 6)
  if (frame === 3) {
    px(ctx, PAL.MARIO_BLUE, lx,      y + 24, 8, 8)
    px(ctx, PAL.MARIO_BLUE, lx + 10, y + 24, 6, 6)
    px(ctx, PAL.MARIO_SHOE, lx,      y + 28, 8, 4)
    px(ctx, PAL.MARIO_SHOE, lx + 10, y + 28, 6, 4)
  } else if (frame === 1) {
    px(ctx, PAL.MARIO_BLUE, lx,      y + 24, 8, 8)
    px(ctx, PAL.MARIO_BLUE, lx + 8,  y + 24, 8, 8)
    px(ctx, PAL.MARIO_SHOE, lx,      y + 28, 8, 4)
    px(ctx, PAL.MARIO_SHOE, lx + 8,  y + 28, 8, 4)
  } else if (frame === 2) {
    px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 24, 6, 8)
    px(ctx, PAL.MARIO_BLUE, lx + 10, y + 24, 6, 8)
    px(ctx, PAL.MARIO_SHOE, lx + 2,  y + 28, 6, 4)
    px(ctx, PAL.MARIO_SHOE, lx + 10, y + 28, 6, 4)
  } else {
    px(ctx, PAL.MARIO_BLUE, lx + 2,  y + 24, 12, 8)
    px(ctx, PAL.MARIO_SHOE, lx,      y + 28,  6, 4)
    px(ctx, PAL.MARIO_SHOE, lx + 10, y + 28,  6, 4)
  }
  ctx.restore()
}

export function drawMarioCape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction,
  frame: number,
  tick: number
) {
  const capeBlow = (tick >> 3) & 1
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 8, 0)
    ctx.scale(-1, 1)
    lx = -8
  }
  if (capeBlow === 0) {
    px(ctx, PAL.CAPE_SHADOW, lx - 2, y + 8,  4, 20)
    px(ctx, PAL.CAPE_YELLOW, lx - 4, y + 12, 6, 16)
  } else {
    px(ctx, PAL.CAPE_SHADOW, lx - 4, y + 10, 6, 18)
    px(ctx, PAL.CAPE_YELLOW, lx - 6, y + 14, 8, 14)
  }
  ctx.restore()
  drawMarioBig(ctx, x, y, dir, frame)
}

export function drawMarioFire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction,
  frame: number
) {
  drawMarioBig(ctx, x, y, dir, frame)
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 8, 0)
    ctx.scale(-1, 1)
    lx = -8
  }
  px(ctx, '#ffffff',      lx,      y + 16, 16, 8)
  px(ctx, PAL.MARIO_BLUE, lx + 4,  y + 16,  8, 8)
  px(ctx, PAL.MARIO_SKIN, lx,      y + 16,  4, 6)
  px(ctx, PAL.MARIO_SKIN, lx + 12, y + 16,  4, 6)
  ctx.restore()
}

export function drawMario(
  ctx: CanvasRenderingContext2D,
  mario: MarioState,
  tick: number
) {
  if (mario.invincible > 0 && (tick >> 2) % 2 === 1) return
  const { x, y, dir, form, frame } = mario
  switch (form) {
    case 'small': drawMarioSmall(ctx, x, y, dir, frame); break
    case 'big':   drawMarioBig(ctx, x, y, dir, frame); break
    case 'cape':  drawMarioCape(ctx, x, y, dir, frame, tick); break
    case 'fire':  drawMarioFire(ctx, x, y, dir, frame); break
  }
}

// ─── Yoshi ───────────────────────────────────────────────────────────────────

export function drawYoshi(
  ctx: CanvasRenderingContext2D,
  yoshi: YoshiState
) {
  const { x, y, dir, frame, tonguePx } = yoshi
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 16, 0)
    ctx.scale(-1, 1)
    lx = -16
  }
  px(ctx, PAL.YOSHI_GREEN,  lx,      y + 6,  24, 18)
  px(ctx, PAL.YOSHI_GREEN,  lx + 4,  y + 2,  16, 8)
  px(ctx, PAL.YOSHI_GREEN,  lx + 12, y,      16, 16)
  dot(ctx, PAL.YOSHI_EYE,   lx + 22, y + 4,  2)
  px(ctx, PAL.YOSHI_GREEN,  lx + 20, y + 2,   4, 2)
  px(ctx, '#e8e8e8',         lx + 22, y + 8,   8, 6)
  dot(ctx, '#c8c8a0',        lx + 24, y + 9,  2)
  px(ctx, PAL.YOSHI_SADDLE, lx + 6,  y + 4,  10, 6)
  px(ctx, PAL.YOSHI_GREEN,  lx - 4,  y + 8,   6, 6)
  px(ctx, PAL.YOSHI_DARK,   lx - 4,  y + 10,  4, 2)
  if (frame === 0) {
    px(ctx, PAL.YOSHI_GREEN, lx + 4,  y + 22, 6, 6)
    px(ctx, PAL.YOSHI_GREEN, lx + 14, y + 22, 6, 6)
    px(ctx, PAL.YOSHI_BOOT,  lx + 2,  y + 26, 8, 4)
    px(ctx, PAL.YOSHI_BOOT,  lx + 12, y + 26, 8, 4)
  } else {
    px(ctx, PAL.YOSHI_GREEN, lx + 2,  y + 22, 6, 6)
    px(ctx, PAL.YOSHI_GREEN, lx + 16, y + 22, 6, 6)
    px(ctx, PAL.YOSHI_BOOT,  lx,      y + 26, 8, 4)
    px(ctx, PAL.YOSHI_BOOT,  lx + 14, y + 26, 8, 4)
  }
  if (tonguePx > 0) {
    px(ctx, PAL.YOSHI_TONGUE, lx + 28, y + 10, tonguePx, 4)
    px(ctx, '#ff5050',         lx + 28 + tonguePx, y + 8,  4, 8)
  }
  ctx.restore()
}

// ─── Enemies ─────────────────────────────────────────────────────────────────

export function drawGoomba(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  stomped = false
) {
  if (stomped) {
    px(ctx, PAL.GOOMBA_BROWN, x,      y + 10, 16, 6)
    px(ctx, PAL.GOOMBA_DARK,  x,      y + 12, 16, 2)
    dot(ctx, PAL.GOOMBA_EYE,  x + 2,  y + 10, 3)
    dot(ctx, PAL.GOOMBA_EYE,  x + 11, y + 10, 3)
    return
  }
  px(ctx, PAL.GOOMBA_BROWN, x + 2,  y,      12, 4)
  px(ctx, PAL.GOOMBA_BROWN, x,      y + 4,  16, 8)
  px(ctx, PAL.GOOMBA_BROWN, x + 2,  y + 12, 12, 4)
  px(ctx, PAL.GOOMBA_DARK,  x + 2,  y + 12, 12, 2)
  px(ctx, '#e8e8e8',         x + 2,  y + 4,   4, 4)
  px(ctx, '#e8e8e8',         x + 10, y + 4,   4, 4)
  dot(ctx, PAL.GOOMBA_EYE,  x + 2,  y + 6,  2)
  dot(ctx, PAL.GOOMBA_EYE,  x + 12, y + 6,  2)
  px(ctx, '#000000',         x + 2,  y + 4,   4, 1)
  px(ctx, '#000000',         x + 10, y + 4,   4, 1)
  if (frame === 0) {
    px(ctx, PAL.GOOMBA_FEET, x,      y + 13, 6, 3)
    px(ctx, PAL.GOOMBA_FEET, x + 10, y + 13, 6, 3)
  } else {
    px(ctx, PAL.GOOMBA_FEET, x + 2,  y + 13, 6, 3)
    px(ctx, PAL.GOOMBA_FEET, x + 8,  y + 13, 6, 3)
  }
}

export function drawKoopa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  dir: Direction,
  stomped = false
) {
  ctx.save()
  let lx = x
  if (dir === 'left') {
    ctx.translate(x + 8, 0)
    ctx.scale(-1, 1)
    lx = -8
  }
  if (stomped) {
    px(ctx, PAL.KOOPA_SHELL,      lx,      y + 4,  16, 14)
    px(ctx, PAL.KOOPA_GREEN,      lx + 2,  y + 6,  12, 10)
    px(ctx, PAL.KOOPA_GREEN_DARK, lx + 6,  y + 8,   4,  6)
    px(ctx, PAL.KOOPA_GREEN_DARK, lx + 2,  y + 10, 10,  2)
    px(ctx, PAL.KOOPA_GREEN_DARK, lx + 6,  y + 6,   2, 10)
    ctx.restore()
    return
  }
  px(ctx, PAL.KOOPA_SKIN,       lx + 2,  y,      12, 8)
  dot(ctx, PAL.KOOPA_EYE,       lx + 10, y + 2,  2)
  px(ctx, PAL.KOOPA_SHELL,      lx,      y + 6,  16, 14)
  px(ctx, PAL.KOOPA_GREEN,      lx + 2,  y + 8,  12, 10)
  px(ctx, PAL.KOOPA_GREEN_DARK, lx + 6,  y + 8,   4, 10)
  px(ctx, PAL.KOOPA_GREEN_DARK, lx + 2,  y + 12, 12,  2)
  if (frame === 0) {
    px(ctx, PAL.KOOPA_SKIN, lx,      y + 18, 6, 4)
    px(ctx, PAL.KOOPA_SKIN, lx + 10, y + 18, 6, 4)
    px(ctx, PAL.KOOPA_SHOE, lx,      y + 20, 6, 4)
    px(ctx, PAL.KOOPA_SHOE, lx + 10, y + 20, 6, 4)
  } else {
    px(ctx, PAL.KOOPA_SKIN, lx + 2,  y + 18, 6, 4)
    px(ctx, PAL.KOOPA_SKIN, lx + 8,  y + 18, 6, 4)
    px(ctx, PAL.KOOPA_SHOE, lx + 2,  y + 20, 6, 4)
    px(ctx, PAL.KOOPA_SHOE, lx + 8,  y + 20, 6, 4)
  }
  ctx.restore()
}

export function drawPiranhaPlant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number
) {
  px(ctx, PAL.PLANT_STEM,  x + 4,  y + 12, 8, 20)
  if (frame === 0) {
    px(ctx, PAL.PLANT_STEM, x - 2,  y + 14, 8, 8)
    px(ctx, PAL.PLANT_STEM, x + 10, y + 18, 8, 8)
  } else {
    px(ctx, PAL.PLANT_STEM, x - 4,  y + 16, 8, 8)
    px(ctx, PAL.PLANT_STEM, x + 12, y + 16, 8, 8)
  }
  px(ctx, PAL.PLANT_RED,   x,      y,       16, 14)
  px(ctx, PAL.PLANT_WHITE, x + 2,  y + 4,   12, 2)
  px(ctx, PAL.PLANT_WHITE, x + 2,  y,        2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 6,  y,        2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 10, y,        2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 14, y,        2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 2,  y + 8,    2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 6,  y + 8,    2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 10, y + 8,    2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 14, y + 8,    2, 4)
  px(ctx, PAL.PLANT_WHITE, x + 4,  y + 2,    3, 3)
  px(ctx, PAL.PLANT_WHITE, x + 11, y + 2,    3, 3)
}

export function drawKoopaShell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  const rot = (tick >> 1) % 4
  px(ctx, PAL.KOOPA_SHELL,      x,     y,     16, 16)
  px(ctx, PAL.KOOPA_GREEN,      x + 2, y + 2, 12, 12)
  if (rot === 0 || rot === 2) {
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 6, y + 2, 4, 12)
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 2, y + 6, 12, 4)
  } else {
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 2, y + 4,  12, 3)
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 4, y + 2,   3, 12)
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 9, y + 2,   3, 12)
    px(ctx, PAL.KOOPA_GREEN_DARK, x + 2, y + 9,  12, 3)
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  tick: number
) {
  switch (enemy.kind) {
    case 'goomba':     drawGoomba(ctx, enemy.x, enemy.y, enemy.frame, enemy.stomped); break
    case 'koopa':      drawKoopa(ctx, enemy.x, enemy.y, enemy.frame, enemy.dir, enemy.stomped); break
    case 'piranha':    drawPiranhaPlant(ctx, enemy.x, enemy.y, enemy.frame); break
    case 'koopa_shell': drawKoopaShell(ctx, enemy.x, enemy.y, tick); break
  }
}

// ─── Power-ups ────────────────────────────────────────────────────────────────

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number
) {
  const widths = [12, 8, 4, 8]
  const w = widths[frame & 3]
  const ox = (12 - w) / 2
  px(ctx, PAL.COIN_GOLD,  x + ox, y,     w, 14)
  px(ctx, '#ffffff',       x + ox, y + 2, 2,  4)
}

export function drawFireFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  px(ctx, PAL.FLOWER_STEM, x + 6, y + 8, 4, 8)
  px(ctx, PAL.FLOWER_LEAF, x + 2, y + 10, 6, 4)
  px(ctx, PAL.FLOWER_LEAF, x + 8, y + 10, 6, 4)
  const alt = (tick >> 2) & 1
  const petals: [number, number][] = [
    [x + 6, y - 2], [x + 6, y + 8], [x + 2, y + 2], [x + 10, y + 2],
  ]
  const pcols = alt
    ? [PAL.FLOWER_RED, PAL.FLOWER_WHITE, PAL.FLOWER_RED, PAL.FLOWER_WHITE]
    : [PAL.FLOWER_WHITE, PAL.FLOWER_RED, PAL.FLOWER_WHITE, PAL.FLOWER_RED]
  for (let i = 0; i < 4; i++) {
    px(ctx, pcols[i], petals[i][0], petals[i][1], 4, 6)
  }
  px(ctx, PAL.QMARK_YELLOW, x + 5, y + 2, 6, 6)
}

export function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  px(ctx, PAL.MARIO_RED, x + 2, y,      12, 4)
  px(ctx, PAL.MARIO_RED, x,     y + 4,   16, 8)
  px(ctx, '#ffffff',      x + 2, y + 2,   4, 4)
  px(ctx, '#ffffff',      x + 10, y + 2,  4, 4)
  px(ctx, '#ffffff',      x + 6,  y + 8,  4, 4)
  px(ctx, '#fffcdc',      x + 2,  y + 10, 12, 6)
  dot(ctx, '#000000',     x + 4,  y + 11, 2)
  dot(ctx, '#000000',     x + 10, y + 11, 2)
}

export function drawCapeFeather(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  const bob = (tick >> 3) & 1
  const by = y + bob * 2
  px(ctx, PAL.CAPE_YELLOW, x + 6, by,      4, 14)
  px(ctx, PAL.CAPE_SHADOW, x + 4, by + 2,  8, 10)
  for (let i = 0; i < 4; i++) {
    px(ctx, '#ffffff', x + 2 - i, by + 3 + i * 2, 6 + i * 2, 1)
  }
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  const rainbow = ['#ff0000','#ff8000','#ffff00','#00ff00','#0000ff','#ff00ff']
  const col = rainbow[tick % rainbow.length]
  px(ctx, col, x + 6,  y,       4, 4)
  px(ctx, col, x + 2,  y + 4,  12, 4)
  px(ctx, col, x,      y + 6,  16, 4)
  px(ctx, col, x + 2,  y + 10,  4, 4)
  px(ctx, col, x + 10, y + 10,  4, 4)
  px(ctx, PAL.STAR_WHITE, x + 6, y + 2, 2, 2)
}

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  pu: PowerUp,
  tick: number
) {
  switch (pu.kind) {
    case 'coin':        drawCoin(ctx, pu.x, pu.y, pu.frame); break
    case 'mushroom':    drawMushroom(ctx, pu.x, pu.y); break
    case 'fire_flower': drawFireFlower(ctx, pu.x, pu.y, tick); break
    case 'cape':        drawCapeFeather(ctx, pu.x, pu.y, tick); break
    case 'star':        drawStar(ctx, pu.x, pu.y, tick); break
  }
}

// ─── Score particles ──────────────────────────────────────────────────────────

export function drawScoreParticle(
  ctx: CanvasRenderingContext2D,
  p: ScoreParticle
) {
  ctx.save()
  ctx.globalAlpha = p.alpha
  ctx.fillStyle = PAL.HUD_TEXT
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(p.value), p.x, p.y)
  ctx.restore()
}

// ─── Fireball ─────────────────────────────────────────────────────────────────

export function drawFireball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  const alt = (tick >> 1) & 1
  px(ctx, alt ? '#ffffff' : '#ffcc00', x,     y,     8, 8)
  px(ctx, alt ? '#ff8800' : '#ff4400', x + 2, y + 2, 4, 4)
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

function drawMarioHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  px(ctx, PAL.MARIO_RED,  x + 1, y,     8, 3)
  px(ctx, PAL.MARIO_RED,  x,     y + 2, 10, 3)
  px(ctx, PAL.MARIO_SKIN, x + 1, y + 4,  8, 5)
  px(ctx, PAL.MARIO_HAIR, x + 1, y + 4,  3, 2)
  dot(ctx, '#000000',     x + 7, y + 5,  2)
  px(ctx, PAL.MARIO_HAIR, x + 3, y + 7,  5, 2)
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: MarioGameState,
  canvasW: number
) {
  const { score, coins, lives, time, level } = state
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, canvasW, 24)
  ctx.fillStyle = PAL.HUD_TEXT
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('MARIO', 8, 14)
  ctx.font = '10px monospace'
  ctx.fillText(String(score).padStart(6, '0'), 8, 23)
  drawCoin(ctx, canvasW / 2 - 50, 4, (state.tick >> 2) & 3)
  ctx.font = '10px monospace'
  ctx.fillText('\xD7' + String(coins).padStart(2, '0'), canvasW / 2 - 34, 14)
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('WORLD', canvasW / 2 + 20, 10)
  ctx.font = '10px monospace'
  ctx.fillText(level, canvasW / 2 + 20, 22)
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'right'
  ctx.fillText('TIME', canvasW - 40, 10)
  ctx.font = '10px monospace'
  ctx.fillText(String(time).padStart(3, '0'), canvasW - 40, 22)
  drawMarioHead(ctx, canvasW - 90, 6)
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('\xD7' + String(lives).padStart(2, '0'), canvasW - 76, 14)
}

// ─── Overlay screens ──────────────────────────────────────────────────────────

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number
) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('GAME OVER', canvasW / 2, canvasH / 2 - 16)
  ctx.font = '16px monospace'
  ctx.fillText('Press Enter to continue', canvasW / 2, canvasH / 2 + 16)
}

export function drawLevelClear(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  score: number
) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#fce000'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('COURSE CLEAR!', canvasW / 2, canvasH / 2 - 20)
  ctx.fillStyle = '#ffffff'
  ctx.font = '16px monospace'
  ctx.fillText('SCORE: ' + String(score).padStart(6, '0'), canvasW / 2, canvasH / 2 + 16)
}

export function drawTitleScreen(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  tick: number
) {
  drawSky(ctx, canvasW, canvasH)
  drawHill(ctx, 20, canvasH - 80, 2)
  drawHill(ctx, canvasW - 100, canvasH - 60, 1.5)
  drawCloud(ctx, 60, 40, 2)
  drawCloud(ctx, canvasW - 140, 30, 1.5)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(canvasW / 2 - 160, canvasH / 2 - 60, 320, 80)
  ctx.fillStyle = '#fce000'
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('SUPER MARIO WORLD', canvasW / 2, canvasH / 2 - 16)
  if ((tick >> 4) & 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
  } else {
    ctx.fillStyle = '#ffffff'
  }
  ctx.font = '16px monospace'
  ctx.fillText('Press Enter to play', canvasW / 2, canvasH / 2 + 20)
  const mx = canvasW / 2 + 60 + Math.sin(tick * 0.05) * 10
  drawMarioSmall(ctx, mx, canvasH / 2 + 40, 'right', (tick >> 3) % 3)
}

// ─── Tile dispatcher ─────────────────────────────────────────────────────────

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  tick: number,
  cameraX: number,
  cameraY: number
) {
  const sx = Math.round(tile.x - cameraX)
  const sy = Math.round(tile.y - cameraY)
  switch (tile.kind) {
    case 'ground':    drawGroundTile(ctx, sx, sy, true); break
    case 'brick':     drawBrickTile(ctx, sx, sy); break
    case 'qmark':     drawQMarkTile(ctx, sx, sy, false, tick); break
    case 'qmark_used': drawQMarkTile(ctx, sx, sy, true, tick); break
    case 'pipe_top':  drawPipe(ctx, sx, sy, tile.h ?? 32); break
    case 'pipe_body':
      px(ctx, PAL.PIPE_GREEN,       sx + 4,  sy, tile.w ?? 24, tile.h ?? TILE)
      px(ctx, PAL.PIPE_GREEN_LIGHT, sx + 4,  sy, 4,            tile.h ?? TILE)
      px(ctx, PAL.PIPE_GREEN_DARK,  sx + 20, sy, 4,            tile.h ?? TILE)
      break
    case 'castle':    drawCastle(ctx, sx, sy); break
    case 'cloud':     drawCloud(ctx, sx, sy, 1); break
    case 'hill':      drawHill(ctx, sx, sy, 1); break
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: MarioGameState
) {
  const { width: W, height: H } = ctx.canvas
  const { cameraX, cameraY, tick } = state

  drawSky(ctx, W, H, state.skyColor)

  if (state.phase === 'title') {
    drawTitleScreen(ctx, W, H, tick)
    return
  }

  // Far-background parallax (50% scroll speed)
  const bgOffX = cameraX * 0.5
  for (let i = 0; i < 6; i++) {
    drawCloud(ctx, i * 180 - (bgOffX % 180), 28, 1 + (i % 2) * 0.5)
  }
  for (let i = 0; i < 3; i++) {
    drawHill(ctx, i * 260 - (bgOffX % 260), H - 70, 1 + (i % 2))
  }

  // Tiles
  for (const tile of state.tiles) {
    drawTile(ctx, tile, tick, cameraX, cameraY)
  }

  // Power-ups
  for (const pu of state.powerUps) {
    const spu = { ...pu, x: Math.round(pu.x - cameraX), y: Math.round(pu.y - cameraY) }
    drawPowerUp(ctx, spu, tick)
  }

  // Enemies
  for (const enemy of state.enemies) {
    const se = { ...enemy, x: Math.round(enemy.x - cameraX), y: Math.round(enemy.y - cameraY) }
    drawEnemy(ctx, se, tick)
  }

  // Yoshi
  if (state.yoshi) {
    const sy2: YoshiState = {
      ...state.yoshi,
      x: Math.round(state.yoshi.x - cameraX),
      y: Math.round(state.yoshi.y - cameraY),
    }
    drawYoshi(ctx, sy2)
  }

  // Mario
  const marioScreen: MarioState = {
    ...state.mario,
    x: Math.round(state.mario.x - cameraX),
    y: Math.round(state.mario.y - cameraY),
  }
  drawMario(ctx, marioScreen, tick)

  // Score particles
  for (const p of state.particles) {
    const sp: ScoreParticle = {
      ...p,
      x: Math.round(p.x - cameraX),
      y: Math.round(p.y - cameraY),
    }
    drawScoreParticle(ctx, sp)
  }

  // HUD
  drawHUD(ctx, state, W)

  // Phase overlays
  if (state.phase === 'gameover') {
    drawGameOver(ctx, W, H)
  } else if (state.phase === 'levelclear') {
    drawLevelClear(ctx, W, H, state.score)
  }
}
