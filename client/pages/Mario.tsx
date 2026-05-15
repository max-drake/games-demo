import { useEffect, useRef, useState, useCallback } from 'react'
import {
  drawFrame,
  type MarioGameState,
  type MarioState,
  type Enemy,
  type Tile,
  type PowerUp,
  type ScoreParticle,
  type YoshiState,
} from '../mario/marioRenderer'

const CANVAS_W = 800
const CANVAS_H = 480
const SCALE = 2
const LOGICAL_W = CANVAS_W / SCALE
const LOGICAL_H = CANVAS_H / SCALE

const GRAVITY = 0.35
const JUMP_VY = -6.5
const WALK_SPEED = 1.8
const RUN_SPEED = 3.0
const MARIO_W = 12
const MARIO_H_SMALL = 16
const TILE_SIZE = 16

function buildTiles(): Tile[] {
  const tiles: Tile[] = []
  const groundY = LOGICAL_H - TILE_SIZE
  for (let i = 0; i < 60; i++) {
    tiles.push({ kind: 'ground', x: i * TILE_SIZE, y: groundY })
    tiles.push({ kind: 'ground', x: i * TILE_SIZE, y: groundY + TILE_SIZE })
  }
  // Remove gap tiles at col 12-13
  const removeGap = (col: number) => {
    const idx = tiles.findIndex(t => t.x === col * TILE_SIZE && t.y === groundY)
    if (idx >= 0) tiles.splice(idx, 1)
  }
  removeGap(12)
  removeGap(13)

  for (let i = 3; i <= 5; i++) tiles.push({ kind: 'brick', x: i * TILE_SIZE, y: groundY - 3 * TILE_SIZE })
  for (let i = 7; i <= 9; i++) tiles.push({ kind: 'brick', x: i * TILE_SIZE, y: groundY - 4 * TILE_SIZE })
  tiles.push({ kind: 'qmark', x: 4 * TILE_SIZE,  y: groundY - 3 * TILE_SIZE })
  tiles.push({ kind: 'qmark', x: 16 * TILE_SIZE, y: groundY - 4 * TILE_SIZE })
  tiles.push({ kind: 'qmark', x: 17 * TILE_SIZE, y: groundY - 4 * TILE_SIZE })
  tiles.push({ kind: 'qmark', x: 18 * TILE_SIZE, y: groundY - 4 * TILE_SIZE })
  tiles.push({ kind: 'pipe_top', x: 22 * TILE_SIZE - 4, y: groundY - 2 * TILE_SIZE, h: 32 })
  tiles.push({ kind: 'pipe_top', x: 28 * TILE_SIZE - 4, y: groundY - 3 * TILE_SIZE, h: 48 })
  for (let step = 0; step < 4; step++) {
    for (let row = 0; row <= step; row++) {
      tiles.push({ kind: 'ground', x: (38 + step) * TILE_SIZE, y: groundY - row * TILE_SIZE })
    }
  }
  tiles.push({ kind: 'castle', x: 55 * TILE_SIZE, y: groundY - 4 * TILE_SIZE, w: 80, h: 64 })
  return tiles
}

function buildEnemies(): Enemy[] {
  const groundY = LOGICAL_H - TILE_SIZE
  return [
    { kind: 'goomba', x: 8 * TILE_SIZE,  y: groundY - TILE_SIZE, frame: 0, dir: 'left' },
    { kind: 'goomba', x: 10 * TILE_SIZE, y: groundY - TILE_SIZE, frame: 0, dir: 'left' },
    { kind: 'koopa',  x: 18 * TILE_SIZE, y: groundY - 24,        frame: 0, dir: 'left' },
    { kind: 'goomba', x: 25 * TILE_SIZE, y: groundY - TILE_SIZE, frame: 0, dir: 'left' },
    { kind: 'piranha', x: 22 * TILE_SIZE - 4, y: groundY - 3 * TILE_SIZE - 8, frame: 0, dir: 'right' },
    { kind: 'koopa',  x: 35 * TILE_SIZE, y: groundY - 24,        frame: 0, dir: 'left' },
  ]
}

function buildPowerUps(): PowerUp[] {
  const groundY = LOGICAL_H - TILE_SIZE
  return [
    { kind: 'coin', x: 4 * TILE_SIZE + 4,  y: groundY - 6 * TILE_SIZE, frame: 0 },
    { kind: 'coin', x: 16 * TILE_SIZE + 4, y: groundY - 6 * TILE_SIZE, frame: 1 },
    { kind: 'coin', x: 17 * TILE_SIZE + 4, y: groundY - 6 * TILE_SIZE, frame: 2 },
    { kind: 'coin', x: 18 * TILE_SIZE + 4, y: groundY - 6 * TILE_SIZE, frame: 3 },
  ]
}

function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function isSolid(kind: string) {
  return ['ground', 'brick', 'qmark', 'qmark_used', 'pipe_top', 'pipe_body'].includes(kind)
}

interface RuntimeState {
  marioX: number
  marioY: number
  marioVX: number
  marioVY: number
  marioOnGround: boolean
  marioDir: 'left' | 'right'
  marioFrame: number
  marioJumping: boolean
  marioForm: 'small' | 'big' | 'cape' | 'fire'
  marioInvincible: number
  marioOnYoshi: boolean
  walkTimer: number
  enemies: Enemy[]
  powerUps: PowerUp[]
  particles: ScoreParticle[]
  yoshi: YoshiState | null
  tiles: Tile[]
  cameraX: number
  cameraY: number
  score: number
  coins: number
  lives: number
  time: number
  tick: number
  phase: 'playing' | 'gameover' | 'levelclear' | 'title'
  level: string
  enemyTimers: number[]
  piranhaTick: number
}

function initRuntime(): RuntimeState {
  return {
    marioX: 3 * TILE_SIZE,
    marioY: LOGICAL_H - TILE_SIZE - MARIO_H_SMALL,
    marioVX: 0,
    marioVY: 0,
    marioOnGround: false,
    marioDir: 'right',
    marioFrame: 0,
    marioJumping: false,
    marioForm: 'small',
    marioInvincible: 0,
    marioOnYoshi: false,
    walkTimer: 0,
    enemies: buildEnemies(),
    powerUps: buildPowerUps(),
    particles: [],
    yoshi: null,
    tiles: buildTiles(),
    cameraX: 0,
    cameraY: 0,
    score: 0,
    coins: 0,
    lives: 3,
    time: 300,
    tick: 0,
    phase: 'title',
    level: '1-1',
    enemyTimers: [0, 0, 0, 0, 0, 0],
    piranhaTick: 0,
  }
}

function toGameState(r: RuntimeState): MarioGameState {
  const mario: MarioState = {
    x: r.marioX,
    y: r.marioY,
    dir: r.marioDir,
    form: r.marioForm,
    frame: r.marioFrame,
    jumping: r.marioJumping,
    running: Math.abs(r.marioVX) >= RUN_SPEED * 0.8,
    invincible: r.marioInvincible,
    onYoshi: r.marioOnYoshi,
  }
  return {
    cameraX: r.cameraX,
    cameraY: r.cameraY,
    tiles: r.tiles,
    enemies: r.enemies,
    powerUps: r.powerUps,
    particles: r.particles,
    mario,
    yoshi: r.yoshi,
    score: r.score,
    coins: r.coins,
    lives: r.lives,
    time: r.time,
    level: r.level,
    phase: r.phase,
    tick: r.tick,
  }
}

function tickRuntime(r: RuntimeState, keys: Set<string>): RuntimeState {
  const s = { ...r }
  s.tick++
  if (s.phase === 'title' || s.phase === 'gameover' || s.phase === 'levelclear') return s

  if (s.tick % 60 === 0 && s.time > 0) s.time--
  if (s.time === 0) { s.phase = 'gameover'; return s }

  const left  = keys.has('ArrowLeft')  || keys.has('KeyA')
  const right = keys.has('ArrowRight') || keys.has('KeyD')
  const jump  = keys.has('ArrowUp')    || keys.has('KeyW') || keys.has('Space')
  const run   = keys.has('ShiftLeft')  || keys.has('ShiftRight') || keys.has('KeyX')
  const speed = run ? RUN_SPEED : WALK_SPEED

  if (left)  { s.marioVX = Math.max(s.marioVX - 0.3, -speed); s.marioDir = 'left' }
  if (right) { s.marioVX = Math.min(s.marioVX + 0.3,  speed); s.marioDir = 'right' }
  if (!left && !right) {
    s.marioVX *= 0.8
    if (Math.abs(s.marioVX) < 0.05) s.marioVX = 0
  }
  if (jump && s.marioOnGround && !s.marioJumping) {
    s.marioVY = JUMP_VY
    s.marioJumping = true
    s.marioOnGround = false
  }
  if (!jump && s.marioVY < -2) s.marioVY = Math.max(s.marioVY, -2)

  s.marioVY += GRAVITY
  s.marioX += s.marioVX
  s.marioY += s.marioVY

  const mH = s.marioForm === 'small' ? MARIO_H_SMALL : MARIO_H_SMALL * 2
  s.marioOnGround = false

  for (const tile of s.tiles) {
    if (!isSolid(tile.kind)) continue
    const tw = tile.w ?? TILE_SIZE
    const th = tile.h ?? TILE_SIZE
    if (!overlaps(s.marioX, s.marioY, MARIO_W, mH, tile.x, tile.y, tw, th)) continue
    const overlapL = (s.marioX + MARIO_W) - tile.x
    const overlapR = (tile.x + tw) - s.marioX
    const overlapT = (s.marioY + mH) - tile.y
    const overlapB = (tile.y + th) - s.marioY
    const minOver = Math.min(overlapL, overlapR, overlapT, overlapB)
    if (minOver === overlapT && s.marioVY > 0) {
      s.marioY = tile.y - mH
      s.marioVY = 0
      s.marioOnGround = true
      s.marioJumping = false
    } else if (minOver === overlapB && s.marioVY < 0) {
      s.marioY = tile.y + th
      s.marioVY = 0.5
      if (tile.kind === 'qmark') {
        (tile as { kind: string }).kind = 'qmark_used'
        s.score += 200
        s.coins++
        s.particles = [...s.particles, { x: tile.x + 8, y: tile.y - 4, value: 200, alpha: 1 }]
      }
    } else if (minOver === overlapL) {
      s.marioX = tile.x - MARIO_W; s.marioVX = 0
    } else {
      s.marioX = tile.x + tw; s.marioVX = 0
    }
  }

  if (s.marioY > LOGICAL_H) {
    s.lives--
    if (s.lives <= 0) { s.phase = 'gameover'; return s }
    s.marioX = 3 * TILE_SIZE
    s.marioY = LOGICAL_H - TILE_SIZE - mH
    s.marioVX = 0; s.marioVY = 0
    s.marioInvincible = 120
  }
  if (s.marioX < 0) { s.marioX = 0; s.marioVX = 0 }

  if (!s.marioOnGround) {
    s.marioFrame = 3
  } else if (Math.abs(s.marioVX) > 0.1) {
    s.walkTimer++
    if (s.walkTimer >= 8) {
      s.walkTimer = 0
      s.marioFrame = s.marioFrame === 0 ? 1 : s.marioFrame === 1 ? 2 : 0
    }
  } else {
    s.marioFrame = 0; s.walkTimer = 0
  }
  if (s.marioInvincible > 0) s.marioInvincible--

  s.piranhaTick++
  const newEnemyTimers = [...s.enemyTimers]
  s.enemies = s.enemies.map((enemy, idx): Enemy => {
    if (enemy.stomped) return enemy
    let { x, y, frame, dir } = enemy
    if (enemy.kind === 'goomba' || enemy.kind === 'koopa') {
      x += dir === 'left' ? -0.5 : 0.5
      newEnemyTimers[idx] = (newEnemyTimers[idx] ?? 0) + 1
      if (newEnemyTimers[idx] >= 16) { newEnemyTimers[idx] = 0; frame = frame === 0 ? 1 : 0 }
      const eh = enemy.kind === 'koopa' ? 24 : TILE_SIZE
      let onGround = false
      for (const tile of s.tiles) {
        if (!isSolid(tile.kind)) continue
        const tw = tile.w ?? TILE_SIZE
        const th = tile.h ?? TILE_SIZE
        if (overlaps(x, y, TILE_SIZE, eh, tile.x, tile.y, tw, th)) {
          const oL = (x + TILE_SIZE) - tile.x
          const oR = (tile.x + tw) - x
          const oT = (y + eh) - tile.y
          const oB = (tile.y + th) - y
          const minO = Math.min(oL, oR, oT, oB)
          if (minO === oT) { y = tile.y - eh; onGround = true }
          else if (minO === oL || minO === oR) { dir = dir === 'left' ? 'right' : 'left'; x = enemy.x }
        }
      }
      if (!onGround) y += 2
    } else if (enemy.kind === 'piranha') {
      frame = (s.piranhaTick >> 4) & 1
    }
    return { ...enemy, x, y, frame, dir }
  })
  s.enemyTimers = newEnemyTimers

  if (s.marioInvincible === 0) {
    const mH2 = s.marioForm === 'small' ? MARIO_H_SMALL : MARIO_H_SMALL * 2
    s.enemies = s.enemies.map(enemy => {
      if (enemy.stomped || enemy.kind === 'piranha') return enemy
      if (!overlaps(s.marioX, s.marioY, MARIO_W, mH2, enemy.x, enemy.y, TILE_SIZE, TILE_SIZE)) return enemy
      const prevBottom = s.marioY + mH2 - s.marioVY
      if (prevBottom <= enemy.y + 4 && s.marioVY > 0) {
        s.marioVY = -4
        s.score += 100
        s.particles = [...s.particles, { x: enemy.x, y: enemy.y, value: 100, alpha: 1 }]
        return { ...enemy, stomped: true }
      }
      s.lives--; s.marioInvincible = 120
      if (s.lives <= 0) s.phase = 'gameover'
      return enemy
    })
  }

  const mH3 = s.marioForm === 'small' ? MARIO_H_SMALL : MARIO_H_SMALL * 2
  s.powerUps = s.powerUps.filter(pu => {
    if (!overlaps(s.marioX, s.marioY, MARIO_W, mH3, pu.x, pu.y, 12, 14)) return true
    if (pu.kind === 'coin') { s.score += 200; s.coins++ }
    else if (pu.kind === 'mushroom') { if (s.marioForm === 'small') s.marioForm = 'big'; s.score += 1000 }
    else if (pu.kind === 'fire_flower') { s.marioForm = 'fire'; s.score += 1000 }
    else if (pu.kind === 'cape') { s.marioForm = 'cape'; s.score += 1000 }
    else if (pu.kind === 'star') { s.marioInvincible = 600; s.score += 1000 }
    s.particles = [...s.particles, { x: pu.x, y: pu.y, value: 200, alpha: 1 }]
    return false
  })
  s.powerUps = s.powerUps.map(pu => pu.kind === 'coin' ? { ...pu, frame: (pu.frame + 1) % 4 } : pu)
  s.particles = s.particles.map(p => ({ ...p, y: p.y - 0.5, alpha: p.alpha - 0.02 })).filter(p => p.alpha > 0)

  if (s.marioX >= 55 * TILE_SIZE) s.phase = 'levelclear'

  const targetCamX = s.marioX - LOGICAL_W / 3
  s.cameraX += (targetCamX - s.cameraX) * 0.15
  s.cameraX = Math.max(0, Math.min(s.cameraX, 60 * TILE_SIZE - LOGICAL_W))

  return s
}

export function Mario() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<RuntimeState>(initRuntime())
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<string>('title')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)

  const startGame = useCallback(() => {
    const s = initRuntime()
    s.phase = 'playing'
    stateRef.current = s
    setPhase('playing')
    setScore(0)
    setLives(3)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault()
      keysRef.current.add(e.code)
      if (e.code === 'Enter') {
        const cur = stateRef.current
        if (cur.phase === 'title' || cur.phase === 'gameover' || cur.phase === 'levelclear') startGame()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [startGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    function loop() {
      if (!ctx) return
      stateRef.current = tickRuntime(stateRef.current, keysRef.current)
      const gs = toGameState(stateRef.current)
      ctx.save()
      ctx.scale(SCALE, SCALE)
      drawFrame(ctx, gs)
      ctx.restore()
      setPhase(gs.phase)
      setScore(gs.score)
      setLives(gs.lives)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <div style={styles.root}>
      <div style={styles.gameWrap}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={styles.canvas} />
        <div style={styles.bar}>
          <span>Score: <b>{score}</b></span>
          <span>Lives: <b>{lives}</b></span>
          <span style={{ color: '#aaa', fontSize: 12 }}>
            {phase === 'title'      && 'Press Enter to start'}
            {phase === 'playing'    && '\u2190 \u2192 move \u00B7 Space jump \u00B7 Shift run'}
            {phase === 'gameover'   && '\uD83D\uDC80 Game Over \u2013 Press Enter'}
            {phase === 'levelclear' && '\uD83C\uDFC6 Level Clear! Press Enter'}
          </span>
          {(phase === 'title' || phase === 'gameover' || phase === 'levelclear') && (
            <button style={styles.btn} onClick={startGame}>
              {phase === 'title' ? '\u25B6 Play' : phase === 'levelclear' ? '\u25B6 Play Again' : '\u25B6 Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh', background: '#1a1a2e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'monospace', color: '#fff',
  },
  gameWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  canvas: { display: 'block', border: '3px solid #444', imageRendering: 'pixelated' },
  bar: {
    width: CANVAS_W, display: 'flex', alignItems: 'center', gap: 24,
    padding: '6px 12px', background: '#0d0d1e', border: '1px solid #333',
    fontSize: 14, boxSizing: 'border-box',
  },
  btn: {
    marginLeft: 'auto', padding: '4px 16px', background: '#e80000',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold',
  },
}
