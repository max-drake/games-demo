/**
 * marioRenderer.ts
 * Pixel-art canvas draw functions for every visual element in the SMW game.
 * All graphics are drawn with canvas 2D primitives (fillRect, arc, fillText).
 * No external sprite sheets or image assets are used.
 *
 * Entry point: renderFrame() — called once per animation frame by the page component.
 */

import type { GameState, Enemy, Player } from './marioTypes'
import type { LevelData } from './levels'
import { CANVAS_W, CANVAS_H, TILE_SIZE } from './marioConstants'

// ─── Tile numeric constants (mirror levels.ts const enum values) ──────────────
const TILE_AIR        =  0
const TILE_GROUND     =  1
const TILE_GROUND_TOP =  2
const TILE_STONE      =  3
const TILE_QUESTION   =  4
const TILE_USED_BLOCK =  5
const TILE_BRICK      =  6
const TILE_COIN       =  8
const TILE_PIPE_TL    =  9
const TILE_PIPE_TR    = 10
const TILE_PIPE_BL    = 11
const TILE_PIPE_BR    = 12
const TILE_GOAL_POLE  = 17

// ─── Color palette ────────────────────────────────────────────────────────────
const SKY_BLUE     = '#5C94FC'
const CLOUD_WHITE  = '#FFFFFF'
const HILL_GREEN   = '#00A800'
const HILL_DARK    = '#007800'
const GROUND_CAP   = '#C84C0C'
const GROUND_FILL  = '#A03000'
const GROUND_GRASS = '#00A800'
const BRICK_ORANGE = '#E86010'
const BRICK_DARK   = '#C84C0C'
const QUESTION_GOLD= '#FAC800'
const QUESTION_DARK= '#C89000'
const USED_GREY    = '#786040'
const STONE_GREY   = '#908070'
const STONE_DARK   = '#706050'
const PIPE_GREEN   = '#00A800'
const PIPE_LIGHT   = '#00D800'
const PIPE_DARK    = '#007800'
const COIN_YELLOW  = '#FCE000'
const MARIO_RED    = '#E40058'
const MARIO_TAN    = '#FCB8A0'
const MARIO_BLUE   = '#0058F8'
const MARIO_BROWN  = '#783000'
const GOOMBA_BROWN = '#AC7C00'
const GOOMBA_DARK  = '#784C00'
const GOOMBA_SKIN  = '#FCB8A0'
const KOOPA_GREEN  = '#00A800'
const KOOPA_LIGHT  = '#78F818'
const KOOPA_SKIN   = '#FCB8A0'
const FIREBALL_ORG = '#FF6010'
const FIREBALL_YEL = '#FFFF00'
const HUD_BG       = '#000000'
const HUD_TEXT     = '#FFFFFF'
const FLAGPOLE_GREY= '#C0C0C0'
const FLAG_GREEN   = '#00C800'

// ─── Master draw call ─────────────────────────────────────────────────────────

/**
 * Master draw call — called every frame by the page component.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  level: LevelData,
  cameraX: number
): void {
  const { screen, tick } = state

  if (screen === 'title') {
    drawTitleScreen(ctx)
    return
  }

  if (screen === 'gameOver') {
    drawBackground(ctx, cameraX)
    drawGameOver(ctx)
    return
  }

  if (screen === 'levelComplete') {
    drawBackground(ctx, cameraX)
    drawTilemap(ctx, level, cameraX)
    drawWinScreen(ctx, tick)
    drawHUD(ctx, state)
    return
  }

  // Normal gameplay (playing / paused)
  drawBackground(ctx, cameraX)
  drawTilemap(ctx, level, cameraX)
  drawCoins(ctx, level, cameraX, tick)
  drawBlocks(ctx, level, tick, cameraX)
  drawEnemies(ctx, state, cameraX, tick)
  drawProjectiles(ctx, state, cameraX)
  drawFloatingScores(ctx, state, cameraX)
  drawMario(ctx, state.player, cameraX, tick)
  drawHUD(ctx, state)

  if (screen === 'paused') {
    drawPauseOverlay(ctx)
  }
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
  ctx.fillStyle = SKY_BLUE
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  drawHills(ctx, cameraX * 0.25)
  drawClouds(ctx, cameraX * 0.16)
}

function drawHills(ctx: CanvasRenderingContext2D, offsetX: number): void {
  const hillDefs = [
    { x: 0,    w: 200, h: 80 },
    { x: 320,  w: 120, h: 55 },
    { x: 520,  w: 180, h: 70 },
    { x: 800,  w: 200, h: 80 },
    { x: 1120, w: 120, h: 55 },
    { x: 1400, w: 160, h: 65 },
    { x: 1700, w: 200, h: 80 },
    { x: 2100, w: 130, h: 50 },
  ]
  const groundY = CANVAS_H - TILE_SIZE * 2
  const period = 2200

  for (const hill of hillDefs) {
    for (let repeat = -1; repeat <= 1; repeat++) {
      const hx = hill.x + repeat * period - (offsetX % period)
      if (hx + hill.w < -10 || hx > CANVAS_W + 10) continue
      const cx = hx + hill.w / 2
      const cy = groundY

      ctx.fillStyle = HILL_DARK
      ctx.beginPath()
      ctx.ellipse(cx, cy, hill.w / 2, hill.h, 0, Math.PI, 0)
      ctx.fill()

      ctx.fillStyle = HILL_GREEN
      ctx.beginPath()
      ctx.ellipse(cx, cy - hill.h * 0.15, hill.w / 2 - 8, hill.h * 0.7, 0, Math.PI, 0)
      ctx.fill()
    }
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, offsetX: number): void {
  const cloudDefs = [
    { x: 150,  y: 40, s: 1.2 },
    { x: 450,  y: 60, s: 0.9 },
    { x: 750,  y: 30, s: 1.4 },
    { x: 1050, y: 55, s: 1.0 },
    { x: 1350, y: 40, s: 1.1 },
    { x: 1650, y: 65, s: 0.85 },
    { x: 1950, y: 35, s: 1.3 },
  ]
  const period = 2200

  for (const cloud of cloudDefs) {
    for (let repeat = -1; repeat <= 1; repeat++) {
      const cx = cloud.x + repeat * period - (offsetX % period)
      if (cx + 80 < -10 || cx - 80 > CANVAS_W + 10) continue
      drawCloud(ctx, cx, cloud.y, cloud.s)
    }
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  ctx.fillStyle = CLOUD_WHITE
  const r = 20 * scale
  ctx.beginPath()
  ctx.arc(cx,       cy + r * 0.2, r,         0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx - r,   cy + r * 0.5, r * 0.75,  0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + r,   cy + r * 0.5, r * 0.8,   0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(cx - r * 1.75, cy + r * 0.5, r * 3.5, r * 0.7)
}

// ─── Tilemap ──────────────────────────────────────────────────────────────────

function drawTilemap(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  cameraX: number
): void {
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE))
  const endCol   = Math.min(level.width - 1, Math.ceil((cameraX + CANVAS_W) / TILE_SIZE))

  for (let row = 0; row < level.height; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = level.tiles[row][col]
      // Skip air, coins (drawn separately), question blocks (drawn in drawBlocks), spawn markers
      if (tile === TILE_AIR || tile === TILE_COIN || tile === TILE_QUESTION) continue

      const sx = col * TILE_SIZE - cameraX
      const sy = row * TILE_SIZE

      drawTile(ctx, tile, sx, sy)
    }
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  sx: number,
  sy: number
): void {
  const T = TILE_SIZE

  switch (tile) {
    case TILE_GROUND: {
      ctx.fillStyle = GROUND_FILL
      ctx.fillRect(sx, sy, T, T)
      ctx.fillStyle = '#7A2800'
      ctx.fillRect(sx, sy, T, 2)
      break
    }

    case TILE_GROUND_TOP: {
      ctx.fillStyle = GROUND_CAP
      ctx.fillRect(sx, sy, T, T)
      ctx.fillStyle = GROUND_GRASS
      ctx.fillRect(sx, sy, T, 4)
      ctx.fillStyle = GROUND_FILL
      ctx.fillRect(sx, sy + 4, T, 2)
      break
    }

    case TILE_STONE: {
      ctx.fillStyle = STONE_GREY
      ctx.fillRect(sx, sy, T, T)
      ctx.fillStyle = STONE_DARK
      ctx.fillRect(sx,         sy,         T, 1)
      ctx.fillRect(sx,         sy,         1, T)
      ctx.fillRect(sx + T - 1, sy,         1, T)
      ctx.fillRect(sx,         sy + T - 1, T, 1)
      break
    }

    case TILE_BRICK: {
      ctx.fillStyle = BRICK_ORANGE
      ctx.fillRect(sx, sy, T, T)
      ctx.fillStyle = BRICK_DARK
      ctx.fillRect(sx, sy,         T, 2)
      ctx.fillRect(sx, sy + T - 2, T, 2)
      ctx.fillRect(sx, sy + T / 2 - 1, T, 2)
      ctx.fillRect(sx + T / 2 - 1, sy,         2, T / 2)
      ctx.fillRect(sx + T - 2,     sy + T / 2, 2, T / 2)
      ctx.fillRect(sx,             sy + T / 2, 2, T / 2)
      break
    }

    case TILE_USED_BLOCK: {
      ctx.fillStyle = USED_GREY
      ctx.fillRect(sx, sy, T, T)
      ctx.fillStyle = '#504030'
      ctx.fillRect(sx,         sy,         T,  2)
      ctx.fillRect(sx,         sy,         2,  T)
      ctx.fillRect(sx + T - 2, sy,         2,  T)
      ctx.fillRect(sx,         sy + T - 2, T,  2)
      break
    }

    case TILE_PIPE_TL:
      drawPipeTopLeft(ctx, sx, sy)
      break
    case TILE_PIPE_TR:
      drawPipeTopRight(ctx, sx, sy)
      break
    case TILE_PIPE_BL:
      drawPipeBodyLeft(ctx, sx, sy)
      break
    case TILE_PIPE_BR:
      drawPipeBodyRight(ctx, sx, sy)
      break

    case TILE_GOAL_POLE:
      // Pole segment — full-height pole drawn in drawBlocks
      ctx.fillStyle = FLAGPOLE_GREY
      ctx.fillRect(sx + T / 2 - 2, sy, 4, T)
      break

    default:
      break
  }
}

// ─── Tile sub-renderers ───────────────────────────────────────────────────────

function drawPipeTopLeft(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const T = TILE_SIZE
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx, sy, T, T)
  ctx.fillStyle = PIPE_LIGHT
  ctx.fillRect(sx + 2, sy + 6, 4, T - 6)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 2, sy, 2, T)
  // cap overhang
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx - 2, sy, T + 2, 6)
  ctx.fillStyle = PIPE_LIGHT
  ctx.fillRect(sx - 1, sy + 1, 5, 4)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 2, sy, 2, 6)
}

function drawPipeTopRight(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const T = TILE_SIZE
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx, sy, T, T)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 3, sy, 3, T)
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx, sy, T + 2, 6)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 2, sy, 2, 6)
}

function drawPipeBodyLeft(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const T = TILE_SIZE
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx, sy, T, T)
  ctx.fillStyle = PIPE_LIGHT
  ctx.fillRect(sx + 2, sy, 4, T)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 2, sy, 2, T)
}

function drawPipeBodyRight(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const T = TILE_SIZE
  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx, sy, T, T)
  ctx.fillStyle = PIPE_DARK
  ctx.fillRect(sx + T - 3, sy, 3, T)
}

// ─── Blocks pass (question blocks + goal pole) ────────────────────────────────

function drawBlocks(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  tick: number,
  cameraX: number
): void {
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE))
  const endCol   = Math.min(level.width - 1, Math.ceil((cameraX + CANVAS_W) / TILE_SIZE))
  const T = TILE_SIZE

  for (let row = 0; row < level.height; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = level.tiles[row][col]
      const sx = col * T - cameraX
      const sy = row * T

      if (tile === TILE_QUESTION) {
        // Pulsing color
        const pulse = Math.floor(tick / 8) % 2 === 0
        ctx.fillStyle = pulse ? QUESTION_GOLD : '#FFAA00'
        ctx.fillRect(sx, sy, T, T)
        ctx.fillStyle = QUESTION_DARK
        ctx.fillRect(sx,         sy,         T, 2)
        ctx.fillRect(sx,         sy,         2, T)
        ctx.fillRect(sx + T - 2, sy,         2, T)
        ctx.fillRect(sx,         sy + T - 2, T, 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', sx + T / 2, sy + T / 2)
      }

      if (tile === TILE_GOAL_POLE) {
        // Draw full-height pole from top of screen to ground
        const groundY = (level.height - 2) * T
        ctx.fillStyle = FLAGPOLE_GREY
        ctx.fillRect(sx + T / 2 - 2, 0, 4, groundY)
        // Ball on top
        ctx.fillStyle = COIN_YELLOW
        ctx.beginPath()
        ctx.arc(sx + T / 2, 10, 8, 0, Math.PI * 2)
        ctx.fill()
        // Animated flag
        const flagY = 10 + ((tick * 2) % (groundY - 30))
        ctx.fillStyle = FLAG_GREEN
        ctx.beginPath()
        ctx.moveTo(sx + T / 2 + 2, flagY)
        ctx.lineTo(sx + T / 2 + 22, flagY + 8)
        ctx.lineTo(sx + T / 2 + 2, flagY + 16)
        ctx.fill()
      }
    }
  }
}

// ─── Coins ────────────────────────────────────────────────────────────────────

function drawCoins(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  cameraX: number,
  tick: number
): void {
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE))
  const endCol   = Math.min(level.width - 1, Math.ceil((cameraX + CANVAS_W) / TILE_SIZE))

  for (let row = 0; row < level.height; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (level.tiles[row][col] !== TILE_COIN) continue
      const cx = col * TILE_SIZE - cameraX + TILE_SIZE / 2
      const cy = row * TILE_SIZE + TILE_SIZE / 2
      drawCoin(ctx, cx, cy, tick + col * 7)
    }
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, tick: number): void {
  const phase = (tick * 4) % 360
  const widthScale = Math.abs(Math.cos((phase * Math.PI) / 180))
  const coinW = Math.max(2, 10 * widthScale)
  const coinH = 12

  ctx.fillStyle = COIN_YELLOW
  ctx.beginPath()
  ctx.ellipse(cx, cy, coinW, coinH, 0, 0, Math.PI * 2)
  ctx.fill()

  if (widthScale > 0.3) {
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(cx - coinW * 0.25, cy, coinW * 0.3, coinH * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── Enemies ──────────────────────────────────────────────────────────────────

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraX: number,
  tick: number
): void {
  for (const enemy of state.enemies) {
    if (enemy.state === 'dead') continue

    const sx = enemy.pos.x - cameraX
    const sy = enemy.pos.y

    if (sx + 32 < 0 || sx - 32 > CANVAS_W) continue

    switch (enemy.type) {
      case 'goomba':
        drawGoomba(ctx, sx, sy, enemy, tick)
        break
      case 'koopaTroopa':
      case 'koopaShell':
        drawKoopa(ctx, sx, sy, enemy, tick)
        break
      case 'piranhPlant':
        drawPiranhaPlant(ctx, sx, sy, tick)
        break
      case 'bullet':
        drawBulletBill(ctx, sx, sy)
        break
      default: {
        // Generic fallback
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(sx - 8, sy - 16, 16, 16)
        break
      }
    }
  }
}

function drawGoomba(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  enemy: Enemy,
  tick: number
): void {
  const stomped = enemy.state === 'stomped'
  const h = stomped ? 6 : 14
  const w = 14
  const bx = sx - w / 2
  const by = sy - h
  const walkPhase = Math.floor(tick / 12) % 2

  // Body
  ctx.fillStyle = GOOMBA_BROWN
  ctx.beginPath()
  ctx.ellipse(sx, by + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()

  if (!stomped) {
    // Feet
    ctx.fillStyle = GOOMBA_DARK
    ctx.fillRect(bx,         by + h - (walkPhase === 0 ? 4 : 2), 5, walkPhase === 0 ? 4 : 4)
    ctx.fillRect(bx + w - 5, by + h - (walkPhase === 1 ? 4 : 2), 5, walkPhase === 1 ? 4 : 4)
    ctx.fillStyle = GOOMBA_SKIN
    ctx.fillRect(bx + 1,     by + h - 5, 3, 4)
    ctx.fillRect(bx + w - 4, by + h - 5, 3, 4)

    // Head top arc
    ctx.fillStyle = GOOMBA_DARK
    ctx.beginPath()
    ctx.arc(sx, by + 4, 6, Math.PI, 0)
    ctx.fill()

    // Eyes
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(bx + 2, by + 3, 4, 3)
    ctx.fillRect(bx + w - 6, by + 3, 4, 3)
    ctx.fillStyle = '#000000'
    ctx.fillRect(bx + 2, by + 4, 2, 2)
    ctx.fillRect(bx + w - 5, by + 4, 2, 2)
    // Brow
    ctx.fillStyle = GOOMBA_DARK
    ctx.fillRect(bx + 2, by + 2, 3, 1)
    ctx.fillRect(bx + w - 5, by + 2, 3, 1)
  }
}

function drawKoopa(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  enemy: Enemy,
  tick: number
): void {
  const isShell = enemy.isShell || enemy.state === 'kicked' || enemy.type === 'koopaShell'
  const w = 12
  const h = isShell ? 14 : 24
  const bx = sx - w / 2
  const by = sy - h

  if (isShell) {
    ctx.fillStyle = KOOPA_GREEN
    ctx.beginPath()
    ctx.ellipse(sx, by + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = KOOPA_LIGHT
    ctx.beginPath()
    ctx.ellipse(sx, by + h / 2 - 2, w / 2 - 3, h / 2 - 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = KOOPA_GREEN
    ctx.fillRect(sx - 1, by + 2, 2, h - 4)
    ctx.fillRect(bx + 2, by + h / 2 - 1, w - 4, 2)
    return
  }

  const walkPhase = Math.floor(tick / 12) % 2

  // Legs
  ctx.fillStyle = KOOPA_SKIN
  ctx.fillRect(bx + 1,     by + h - (walkPhase === 0 ? 8 : 6), 3, walkPhase === 0 ? 8 : 6)
  ctx.fillRect(bx + w - 4, by + h - (walkPhase === 1 ? 8 : 6), 3, walkPhase === 1 ? 8 : 6)

  // Shell on back
  ctx.fillStyle = KOOPA_GREEN
  ctx.beginPath()
  ctx.ellipse(sx, by + h * 0.55, w / 2, h * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = KOOPA_LIGHT
  ctx.beginPath()
  ctx.ellipse(sx - 1, by + h * 0.48, w / 2 - 3, h * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = KOOPA_SKIN
  ctx.beginPath()
  ctx.arc(sx, by + 5, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#000000'
  const eyeX = enemy.facing === 'right' ? sx + 2 : sx - 2
  ctx.beginPath()
  ctx.arc(eyeX, by + 4, 1.5, 0, Math.PI * 2)
  ctx.fill()
  // Neck
  ctx.fillStyle = KOOPA_SKIN
  ctx.fillRect(bx + Math.round(w * 0.3), by + 8, Math.round(w * 0.4), 5)
  void bx
}

function drawPiranhaPlant(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tick: number
): void {
  const mouthOpen = Math.floor(tick / 30) % 2 === 0
  const stemH = 20
  const stemW = 6
  const headR = 10

  ctx.fillStyle = PIPE_GREEN
  ctx.fillRect(sx - stemW / 2, sy - stemH, stemW, stemH)

  ctx.fillStyle = '#E80000'
  ctx.beginPath()
  ctx.arc(sx, sy - stemH - headR, headR, 0, Math.PI * 2)
  ctx.fill()

  if (mouthOpen) {
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(sx, sy - stemH - headR, headR * 0.6, 0, Math.PI)
    ctx.fill()
  }

  ctx.fillStyle = '#FFFFFF'
  for (let t = 0; t < 3; t++) {
    const tx = sx - headR * 0.6 + t * headR * 0.6
    const ty = sy - stemH - headR + headR * 0.2
    ctx.fillRect(tx, ty, 3, 5)
  }
}

function drawBulletBill(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  const w = 20, h = 12
  ctx.fillStyle = '#303030'
  ctx.fillRect(sx - w / 2, sy - h / 2, w, h)
  ctx.fillStyle = '#606060'
  ctx.fillRect(sx - w / 2 + 2, sy - h / 2 + 2, w - 4, h - 4)
  ctx.fillStyle = '#303030'
  ctx.fillRect(sx + w / 2, sy - h / 2 + 3, 4, h - 6)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(sx - 2, sy - 2, 4, 4)
  ctx.fillStyle = '#000000'
  ctx.fillRect(sx - 1, sy - 1, 2, 2)
}

// ─── Mario ────────────────────────────────────────────────────────────────────

function drawMario(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cameraX: number,
  tick: number
): void {
  // Damage flicker: hide every other 4-frame window when hurtTimer > 0
  if (player.hurtTimer > 0 && Math.floor(tick / 4) % 2 === 1) return
  // Star invincibility rainbow flicker
  if (player.starTimer > 0 && Math.floor(tick / 2) % 2 === 1) return

  const sx = player.pos.x - cameraX
  const sy = player.pos.y
  const isSuper = player.powerUp !== 'small'
  const facing  = player.facing

  if (isSuper) {
    drawSuperMario(ctx, sx, sy, facing, player, tick)
  } else {
    drawSmallMario(ctx, sx, sy, facing, player, tick)
  }
}

function drawSmallMario(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  facing: 'left' | 'right',
  player: Player,
  tick: number
): void {
  const w = 12, h = 16
  const left = cx - w / 2
  const top  = by - h
  const isWalking = player.state === 'walking' || player.state === 'running'
  const walkFrame = isWalking ? Math.floor(tick / 8) % 3 : 0

  // Hat
  ctx.fillStyle = MARIO_RED
  ctx.fillRect(left + 2, top,     w - 4, 4)
  ctx.fillRect(left - 1, top + 2, w + 2, 2)

  // Face / skin
  ctx.fillStyle = MARIO_TAN
  ctx.fillRect(left + 1, top + 4, w - 2, 5)

  // Mustache
  ctx.fillStyle = MARIO_BROWN
  ctx.fillRect(left + 2, top + 7, w - 4, 2)

  // Eye
  ctx.fillStyle = '#000000'
  ctx.fillRect(facing === 'right' ? left + 7 : left + 2, top + 5, 2, 2)

  // Body / overalls
  ctx.fillStyle = MARIO_RED
  ctx.fillRect(left + 1, top + 9,  w - 2, 3)
  ctx.fillStyle = MARIO_BLUE
  ctx.fillRect(left + 1, top + 12, w - 2, 4)

  // Legs / shoes
  ctx.fillStyle = MARIO_BROWN
  if (walkFrame === 0) {
    ctx.fillRect(left, top + h - 3, w, 3)
  } else if (walkFrame === 1) {
    ctx.fillRect(left,       top + h - 3, w / 2, 3)
    ctx.fillRect(left + w/2, top + h - 5, w / 2, 3)
  } else {
    ctx.fillRect(left,       top + h - 5, w / 2, 3)
    ctx.fillRect(left + w/2, top + h - 3, w / 2, 3)
  }
}

function drawSuperMario(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  facing: 'left' | 'right',
  player: Player,
  tick: number
): void {
  const w = 14, h = 32
  const left = cx - w / 2
  const top  = by - h
  const isWalking = player.state === 'walking' || player.state === 'running'
  const walkFrame = isWalking ? Math.floor(tick / 8) % 3 : 0
  const isFire = player.powerUp === 'fire'

  // Hat
  ctx.fillStyle = isFire ? '#FFFFFF' : MARIO_RED
  ctx.fillRect(left + 2, top,     w - 2, 5)
  ctx.fillRect(left - 1, top + 3, w + 2, 3)

  // Face
  ctx.fillStyle = MARIO_TAN
  ctx.fillRect(left + 1, top + 6,  w - 2, 7)
  ctx.fillStyle = MARIO_BROWN
  ctx.fillRect(left + 2, top + 11, w - 4, 2)
  ctx.fillStyle = '#000000'
  ctx.fillRect(facing === 'right' ? left + 8 : left + 2, top + 7, 2, 2)

  // Shirt
  ctx.fillStyle = isFire ? '#FFFFFF' : MARIO_RED
  ctx.fillRect(left + 1, top + 13, w - 2, 5)

  // Overalls
  ctx.fillStyle = isFire ? '#E40058' : MARIO_BLUE
  ctx.fillRect(left + 2, top + 18, w - 4, 8)
  ctx.fillRect(left + 2, top + 13, 2, 5)      // left strap
  ctx.fillRect(left + w - 4, top + 13, 2, 5)  // right strap

  // Legs
  ctx.fillStyle = isFire ? '#E40058' : MARIO_BLUE
  if (walkFrame === 0) {
    ctx.fillRect(left + 1, top + 26, 5, 6)
    ctx.fillRect(left + 8, top + 26, 5, 6)
  } else if (walkFrame === 1) {
    ctx.fillRect(left + 1, top + 24, 5, 8)
    ctx.fillRect(left + 8, top + 28, 5, 4)
  } else {
    ctx.fillRect(left + 1, top + 28, 5, 4)
    ctx.fillRect(left + 8, top + 24, 5, 8)
  }

  // Shoes
  ctx.fillStyle = MARIO_BROWN
  ctx.fillRect(left,     top + h - 3, 6, 3)
  ctx.fillRect(left + 8, top + h - 3, 6, 3)

  // Cape
  if (player.powerUp === 'cape') {
    ctx.fillStyle = '#E8C000'
    ctx.beginPath()
    const anchorX = facing === 'right' ? left - 2 : left + w + 2
    const tipX    = facing === 'right' ? left - 14 : left + w + 14
    ctx.moveTo(anchorX, top + 13)
    ctx.lineTo(tipX,    top + 20)
    ctx.lineTo(anchorX, top + 28)
    ctx.fill()
  }
}

// ─── Projectiles ──────────────────────────────────────────────────────────────

function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraX: number
): void {
  for (const proj of state.projectiles) {
    const sx = proj.pos.x - cameraX
    const sy = proj.pos.y
    if (sx + 16 < 0 || sx - 16 > CANVAS_W) continue

    ctx.fillStyle = FIREBALL_ORG
    ctx.beginPath()
    ctx.arc(sx, sy, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = FIREBALL_YEL
    ctx.beginPath()
    ctx.arc(sx, sy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── Floating Scores ──────────────────────────────────────────────────────────

function drawFloatingScores(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraX: number
): void {
  ctx.font = 'bold 12px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const fs of state.floatingScores) {
    const sx = fs.pos.x - cameraX
    const sy = fs.pos.y
    if (sx + 40 < 0 || sx - 40 > CANVAS_W) continue

    const alpha = Math.min(1, fs.timer / 30)
    ctx.globalAlpha = alpha
    ctx.fillStyle = COIN_YELLOW
    ctx.fillText(String(fs.value), sx, sy)
    ctx.globalAlpha = 1
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { hud } = state
  const barH = 32

  // HUD background
  ctx.fillStyle = HUD_BG
  ctx.globalAlpha = 0.75
  ctx.fillRect(0, 0, CANVAS_W, barH)
  ctx.globalAlpha = 1

  ctx.fillStyle = HUD_TEXT
  ctx.font = 'bold 13px monospace'
  ctx.textBaseline = 'middle'

  // Score section (left)
  ctx.textAlign = 'left'
  ctx.fillText('MARIO', 20, 10)
  ctx.fillText(String(hud.score).padStart(6, '0'), 20, 24)

  // Coins
  ctx.fillStyle = COIN_YELLOW
  ctx.textAlign = 'center'
  ctx.fillText('★', 178, 10)
  ctx.fillStyle = HUD_TEXT
  ctx.fillText('×' + String(hud.coins).padStart(2, '0'), 200, 10)

  // Lives
  ctx.fillStyle = MARIO_RED
  ctx.fillText('♥', 178, 24)
  ctx.fillStyle = HUD_TEXT
  ctx.fillText('×' + String(hud.lives).padStart(2, '0'), 200, 24)

  // World label (center)
  ctx.textAlign = 'center'
  ctx.fillStyle = HUD_TEXT
  ctx.fillText('WORLD', CANVAS_W / 2, 10)
  ctx.fillText(hud.world, CANVAS_W / 2, 24)

  // Timer (right)
  ctx.textAlign = 'right'
  ctx.fillStyle = HUD_TEXT
  ctx.fillText('TIME', CANVAS_W - 20, 10)
  const timeVal = Math.max(0, Math.ceil(hud.timeRemaining))
  ctx.fillStyle = timeVal <= 60 ? '#FF4040' : HUD_TEXT
  ctx.fillText(String(timeVal).padStart(3, ' '), CANVAS_W - 20, 24)
}

// ─── Title Screen ─────────────────────────────────────────────────────────────

export function drawTitleScreen(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SKY_BLUE
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Ground
  ctx.fillStyle = GROUND_GRASS
  ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 6)
  ctx.fillStyle = GROUND_CAP
  ctx.fillRect(0, CANVAS_H - 44, CANVAS_W, 44)

  // Clouds
  drawCloud(ctx, 130, 60, 1.5)
  drawCloud(ctx, 480, 80, 1.2)
  drawCloud(ctx, 680, 50, 1.0)

  const titleX = CANVAS_W / 2

  // Title card shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(titleX - 252, CANVAS_H / 2 - 106, 504, 72)

  // Title card background
  ctx.fillStyle = MARIO_BLUE
  ctx.fillRect(titleX - 250, CANVAS_H / 2 - 108, 500, 68)
  ctx.fillStyle = QUESTION_GOLD
  ctx.fillRect(titleX - 248, CANVAS_H / 2 - 106, 496, 64)

  // Title text
  ctx.fillStyle = MARIO_RED
  ctx.font = 'bold 38px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SUPER MARIO WORLD', titleX, CANVAS_H / 2 - 78)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 14px monospace'
  ctx.fillText('© 1990 NINTENDO', titleX, CANVAS_H / 2 - 52)

  // Blinking prompt
  const blink = Math.floor(Date.now() / 500) % 2 === 0
  if (blink) {
    ctx.fillStyle = COIN_YELLOW
    ctx.font = 'bold 18px monospace'
    ctx.fillText('PRESS SPACE TO START', titleX, CANVAS_H / 2 + 10)
  }

  // Small Mario on title
  drawTitleMario(ctx, titleX - 100, CANVAS_H - 60)

  // Spinning coins
  for (let i = 0; i < 5; i++) {
    drawCoin(ctx, titleX + 60 + i * 28, CANVAS_H / 2 + 60, Math.floor(Date.now() / 100) + i * 15)
  }
}

function drawTitleMario(ctx: CanvasRenderingContext2D, cx: number, by: number): void {
  const left = cx - 8, top = by - 28
  ctx.fillStyle = MARIO_RED
  ctx.fillRect(left + 2, top,     12, 5)
  ctx.fillRect(left - 1, top + 3, 18, 3)
  ctx.fillStyle = MARIO_TAN
  ctx.fillRect(left + 1, top + 6, 14, 7)
  ctx.fillStyle = MARIO_BROWN
  ctx.fillRect(left + 2, top + 11, 12, 2)
  ctx.fillStyle = MARIO_RED
  ctx.fillRect(left + 1, top + 13, 14, 5)
  ctx.fillStyle = MARIO_BLUE
  ctx.fillRect(left + 2, top + 18, 12, 10)
  ctx.fillStyle = MARIO_BROWN
  ctx.fillRect(left,     top + 28, 6, 3)
  ctx.fillRect(left + 10, top + 28, 6, 3)
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

export function drawGameOver(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 56px monospace'
  ctx.fillText('GAME OVER', CANVAS_W / 2 + 3, CANVAS_H / 2 + 3)

  ctx.fillStyle = MARIO_RED
  ctx.font = 'bold 56px monospace'
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '18px monospace'
  ctx.fillText('PRESS ENTER TO CONTINUE', CANVAS_W / 2, CANVAS_H / 2 + 50)
}

// ─── Win Screen ───────────────────────────────────────────────────────────────

export function drawWinScreen(ctx: CanvasRenderingContext2D, tick: number): void {
  const fireworkPositions = [
    { x: 150, y: 100 },
    { x: 400, y: 80  },
    { x: 650, y: 110 },
    { x: 260, y: 160 },
    { x: 540, y: 140 },
  ]

  for (let i = 0; i < fireworkPositions.length; i++) {
    const fw = fireworkPositions[i]
    const phase = (tick * 3 + i * 40) % 120
    if (phase < 60) drawFirework(ctx, fw.x, fw.y, phase)
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, CANVAS_H / 2 - 60, CANVAS_W, 120)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 48px monospace'
  ctx.fillText('COURSE CLEAR!', CANVAS_W / 2 + 2, CANVAS_H / 2 - 18 + 2)

  ctx.fillStyle = COIN_YELLOW
  ctx.font = 'bold 48px monospace'
  ctx.fillText('COURSE CLEAR!', CANVAS_W / 2, CANVAS_H / 2 - 18)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '20px monospace'
  ctx.fillText("YOU'RE WINNER!", CANVAS_W / 2, CANVAS_H / 2 + 24)
}

function drawFirework(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  phase: number
): void {
  const maxR = 40
  const r = (phase / 60) * maxR
  const alpha = 1 - phase / 60
  const colors = ['#FF4040', '#40FF40', '#4040FF', '#FFFF40', '#FF40FF', '#40FFFF']

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    ctx.globalAlpha = alpha
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = alpha * 0.6
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(1, 4 - phase / 15), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// ─── Pause Overlay ────────────────────────────────────────────────────────────

function drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 36px monospace'
  ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2)
  ctx.font = '16px monospace'
  ctx.fillText('Press ENTER to resume', CANVAS_W / 2, CANVAS_H / 2 + 36)
}
