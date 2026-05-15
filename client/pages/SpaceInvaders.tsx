import { useEffect, useRef, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 800
const CANVAS_H = 600
const TICK_MS = 16
const PLAYER_W = 40
const PLAYER_H = 20
const PLAYER_SPEED = 4
const PLAYER_BULLET_SPEED = 8
const ENEMY_BULLET_SPEED = 3
const ENEMY_COLS = 11
const ENEMY_ROWS = 5
const ENEMY_W = 36
const ENEMY_H = 28
const ENEMY_GAP_X = 14
const ENEMY_GAP_Y = 14
const ENEMY_STEP_X = 12
const ENEMY_STEP_Y = 16
const ENEMY_TICK_START = 60
const SHIELD_SEGMENTS_W = 10
const SHIELD_SEGMENTS_H = 6
const SHIELD_W = SHIELD_SEGMENTS_W * 6
const SEGMENT_SIZE = 6
const UFO_SPEED = 1.5
const UFO_SCORE = 150
const UFO_INTERVAL_MIN = 800
const UFO_INTERVAL_MAX = 1500

type EnemyType = 0 | 1 | 2

interface Enemy {
  col: number
  row: number
  type: EnemyType
  alive: boolean
  frame: number
}

interface Bullet {
  id: number
  x: number
  y: number
  vy: number
  active: boolean
}

interface Shield {
  x: number
  y: number
  segments: boolean[][]
}

interface UFO {
  active: boolean
  x: number
  dir: 1 | -1
}

interface GameState {
  player: { x: number; dx: number }
  enemies: Enemy[]
  bullets: Bullet[]
  enemyBullets: Bullet[]
  shields: Shield[]
  ufo: UFO
  score: number
  lives: number
  level: number
  enemyOffsetX: number
  enemyOffsetY: number
  enemyDir: 1 | -1
  enemyTick: number
  enemyTickInterval: number
  bulletId: number
  playerInvincible: number
  gameOver: boolean
  won: boolean
  tickCount: number
  nextUfoTick: number
}

const ENEMY_SCORES: Record<EnemyType, number> = { 0: 30, 1: 20, 2: 10 }

const ENEMY_COLORS: Record<EnemyType, string> = {
  0: '#ff4488',
  1: '#44aaff',
  2: '#88ff44',
}
const BG_COLOR = '#0a0a1a'
const PLAYER_COLOR = '#00ff88'
const BULLET_COLOR = '#ffffff'
const ENEMY_BULLET_COLOR = '#ff6600'
const SHIELD_COLOR = '#00cc44'
const UFO_COLOR = '#ff2222'

function makeShield(x: number, y: number): Shield {
  const segments: boolean[][] = []
  for (let r = 0; r < SHIELD_SEGMENTS_H; r++) {
    segments[r] = []
    for (let c = 0; c < SHIELD_SEGMENTS_W; c++) {
      const midLeft = Math.floor(SHIELD_SEGMENTS_W * 0.3)
      const midRight = Math.floor(SHIELD_SEGMENTS_W * 0.7)
      const isBottomNotch = r >= SHIELD_SEGMENTS_H - 2 && c >= midLeft && c <= midRight
      const isCornerTL = r === 0 && c === 0
      const isCornerTR = r === 0 && c === SHIELD_SEGMENTS_W - 1
      segments[r][c] = !isBottomNotch && !isCornerTL && !isCornerTR
    }
  }
  return { x, y, segments }
}

function initGame(level: number): GameState {
  const enemies: Enemy[] = []
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      const type: EnemyType = row === 0 ? 0 : row <= 2 ? 1 : 2
      enemies.push({ col, row, type, alive: true, frame: 0 })
    }
  }

  const shieldYBase = CANVAS_H - 120
  const shieldCount = 4
  const totalWidth = shieldCount * SHIELD_W + (shieldCount - 1) * 60
  const startX = (CANVAS_W - totalWidth) / 2
  const shields: Shield[] = []
  for (let i = 0; i < shieldCount; i++) {
    shields.push(makeShield(startX + i * (SHIELD_W + 60), shieldYBase))
  }

  const speed = Math.min(60, Math.max(8, ENEMY_TICK_START - (level - 1) * 8))

  return {
    player: { x: CANVAS_W / 2 - PLAYER_W / 2, dx: 0 },
    enemies,
    bullets: [],
    enemyBullets: [],
    shields,
    ufo: { active: false, x: 0, dir: 1 },
    score: 0,
    lives: 3,
    level,
    enemyOffsetX: 0,
    enemyOffsetY: 0,
    enemyDir: 1,
    enemyTick: 0,
    enemyTickInterval: speed,
    bulletId: 0,
    playerInvincible: 0,
    gameOver: false,
    won: false,
    tickCount: 0,
    nextUfoTick: UFO_INTERVAL_MIN + Math.floor(Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN)),
  }
}

function tickGame(state: GameState, keys: Set<string>): GameState {
  if (state.gameOver || state.won) return state

  const s = { ...state }
  s.tickCount++

  let pdx = 0
  if (keys.has('ArrowLeft') || keys.has('KeyA')) pdx = -PLAYER_SPEED
  if (keys.has('ArrowRight') || keys.has('KeyD')) pdx = PLAYER_SPEED
  s.player = {
    x: Math.max(0, Math.min(CANVAS_W - PLAYER_W, s.player.x + pdx)),
    dx: pdx,
  }

  const playerBulletsAlive = s.bullets.filter(b => b.active).length
  if ((keys.has('Space') || keys.has('ArrowUp')) && playerBulletsAlive === 0) {
    s.bullets = [
      ...s.bullets,
      {
        id: s.bulletId++,
        x: s.player.x + PLAYER_W / 2,
        y: CANVAS_H - 60 - PLAYER_H,
        vy: -PLAYER_BULLET_SPEED,
        active: true,
      },
    ]
  }

  s.bullets = s.bullets.map(b => ({
    ...b,
    y: b.y + b.vy,
    active: b.active && b.y > 0,
  }))

  s.enemyBullets = s.enemyBullets.map(b => ({
    ...b,
    y: b.y + b.vy,
    active: b.active && b.y < CANVAS_H,
  }))

  if (!s.ufo.active && s.tickCount >= s.nextUfoTick) {
    s.ufo = { active: true, x: s.ufo.dir === 1 ? -40 : CANVAS_W + 40, dir: s.ufo.dir }
    s.nextUfoTick = s.tickCount + UFO_INTERVAL_MIN + Math.floor(Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN))
  }
  if (s.ufo.active) {
    s.ufo = { ...s.ufo, x: s.ufo.x + UFO_SPEED * s.ufo.dir }
    if (s.ufo.x > CANVAS_W + 60 || s.ufo.x < -60) {
      s.ufo = { active: false, x: 0, dir: (s.ufo.dir * -1) as 1 | -1 }
    }
  }

  s.enemyTick++
  const aliveEnemies = s.enemies.filter(e => e.alive)
  const liveCount = aliveEnemies.length
  const adjustedInterval = Math.max(4, Math.floor(s.enemyTickInterval * liveCount / (ENEMY_ROWS * ENEMY_COLS)))

  if (s.enemyTick >= adjustedInterval) {
    s.enemyTick = 0
    s.enemies = s.enemies.map(e => ({ ...e, frame: e.alive ? (e.frame === 0 ? 1 : 0) : e.frame }))

    const aliveXs = aliveEnemies.map(e => e.col * (ENEMY_W + ENEMY_GAP_X) + s.enemyOffsetX)
    const minX = Math.min(...aliveXs)
    const maxX = Math.max(...aliveXs) + ENEMY_W

    let newOffsetX = s.enemyOffsetX + ENEMY_STEP_X * s.enemyDir
    let newOffsetY = s.enemyOffsetY
    let newDir = s.enemyDir

    if (s.enemyDir === 1 && maxX + ENEMY_STEP_X > CANVAS_W) {
      newOffsetX = s.enemyOffsetX
      newOffsetY += ENEMY_STEP_Y
      newDir = -1
    } else if (s.enemyDir === -1 && minX - ENEMY_STEP_X < 0) {
      newOffsetX = s.enemyOffsetX
      newOffsetY += ENEMY_STEP_Y
      newDir = 1
    }

    s.enemyOffsetX = newOffsetX
    s.enemyOffsetY = newOffsetY
    s.enemyDir = newDir

    if (aliveEnemies.length > 0 && s.enemyBullets.filter(b => b.active).length < 3) {
      const cols = [...new Set(aliveEnemies.map(e => e.col))]
      const fireCol = cols[Math.floor(Math.random() * cols.length)]
      const colEnemies = aliveEnemies.filter(e => e.col === fireCol)
      const bottomEnemy = colEnemies.reduce((a, b) => a.row > b.row ? a : b)
      const ex = bottomEnemy.col * (ENEMY_W + ENEMY_GAP_X) + s.enemyOffsetX + ENEMY_W / 2
      const ey = bottomEnemy.row * (ENEMY_H + ENEMY_GAP_Y) + s.enemyOffsetY + 60 + ENEMY_H
      s.enemyBullets = [
        ...s.enemyBullets,
        { id: s.bulletId++, x: ex, y: ey, vy: ENEMY_BULLET_SPEED, active: true },
      ]
    }
  }

  let newBullets = [...s.bullets]
  let newEnemies = [...s.enemies]
  let scoreGain = 0

  for (const bullet of newBullets) {
    if (!bullet.active) continue
    for (const enemy of newEnemies) {
      if (!enemy.alive) continue
      const ex = enemy.col * (ENEMY_W + ENEMY_GAP_X) + s.enemyOffsetX
      const ey = enemy.row * (ENEMY_H + ENEMY_GAP_Y) + s.enemyOffsetY + 60
      if (
        bullet.x >= ex && bullet.x <= ex + ENEMY_W &&
        bullet.y >= ey && bullet.y <= ey + ENEMY_H
      ) {
        enemy.alive = false
        bullet.active = false
        scoreGain += ENEMY_SCORES[enemy.type]
        break
      }
    }
  }

  if (s.ufo.active) {
    for (const bullet of newBullets) {
      if (!bullet.active) continue
      if (bullet.y <= 30 && Math.abs(bullet.x - s.ufo.x) < 30) {
        bullet.active = false
        s.ufo = { ...s.ufo, active: false }
        scoreGain += UFO_SCORE
      }
    }
  }

  s.bullets = newBullets
  s.enemies = newEnemies
  s.score += scoreGain

  for (const shield of s.shields) {
    for (const bullet of s.bullets) {
      if (!bullet.active) continue
      const localX = bullet.x - shield.x
      const localY = bullet.y - shield.y
      const segC = Math.floor(localX / SEGMENT_SIZE)
      const segR = Math.floor(localY / SEGMENT_SIZE)
      if (segR >= 0 && segR < SHIELD_SEGMENTS_H && segC >= 0 && segC < SHIELD_SEGMENTS_W) {
        if (shield.segments[segR][segC]) {
          shield.segments[segR][segC] = false
          bullet.active = false
        }
      }
    }
  }

  if (s.playerInvincible === 0) {
    const px = s.player.x
    const py = CANVAS_H - 60 - PLAYER_H
    for (const bullet of s.enemyBullets) {
      if (!bullet.active) continue
      if (
        bullet.x >= px && bullet.x <= px + PLAYER_W &&
        bullet.y >= py && bullet.y <= py + PLAYER_H
      ) {
        bullet.active = false
        s.lives--
        s.playerInvincible = 120
        if (s.lives <= 0) {
          s.gameOver = true
          return s
        }
      }
    }
  } else {
    s.playerInvincible--
  }

  for (const shield of s.shields) {
    for (const bullet of s.enemyBullets) {
      if (!bullet.active) continue
      const localX = bullet.x - shield.x
      const localY = bullet.y - shield.y
      const segC = Math.floor(localX / SEGMENT_SIZE)
      const segR = Math.floor(localY / SEGMENT_SIZE)
      if (segR >= 0 && segR < SHIELD_SEGMENTS_H && segC >= 0 && segC < SHIELD_SEGMENTS_W) {
        if (shield.segments[segR][segC]) {
          shield.segments[segR][segC] = false
          const blastRadius = 1
          for (let dr = -blastRadius; dr <= blastRadius; dr++) {
            for (let dc = -blastRadius; dc <= blastRadius; dc++) {
              const nr = segR + dr
              const nc = segC + dc
              if (nr >= 0 && nr < SHIELD_SEGMENTS_H && nc >= 0 && nc < SHIELD_SEGMENTS_W) {
                if (Math.random() < 0.5) shield.segments[nr][nc] = false
              }
            }
          }
          bullet.active = false
        }
      }
    }
  }

  for (const enemy of s.enemies) {
    if (!enemy.alive) continue
    const ey = enemy.row * (ENEMY_H + ENEMY_GAP_Y) + s.enemyOffsetY + 60
    if (ey + ENEMY_H >= CANVAS_H - 60) {
      s.gameOver = true
      return s
    }
  }

  if (s.enemies.every(e => !e.alive)) {
    s.won = true
  }

  return s
}

function drawEnemy(ctx: CanvasRenderingContext2D, type: EnemyType, x: number, y: number, frame: number) {
  ctx.save()
  ctx.fillStyle = ENEMY_COLORS[type]
  if (type === 0) {
    ctx.fillRect(x + 10, y + 2, 16, 4)
    ctx.fillRect(x + 6, y + 6, 24, 10)
    ctx.fillRect(x + 2, y + 10, 4, 6)
    ctx.fillRect(x + 30, y + 10, 4, 6)
    if (frame === 0) {
      ctx.fillRect(x + 4, y + 18, 6, 6)
      ctx.fillRect(x + 26, y + 18, 6, 6)
    } else {
      ctx.fillRect(x + 8, y + 18, 6, 6)
      ctx.fillRect(x + 22, y + 18, 6, 6)
    }
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(x + 10, y + 8, 4, 4)
    ctx.fillRect(x + 22, y + 8, 4, 4)
  } else if (type === 1) {
    if (frame === 0) {
      ctx.fillRect(x + 2, y + 6, 4, 8)
      ctx.fillRect(x + 30, y + 6, 4, 8)
    } else {
      ctx.fillRect(x + 0, y + 2, 4, 8)
      ctx.fillRect(x + 32, y + 2, 4, 8)
    }
    ctx.fillRect(x + 6, y + 4, 24, 10)
    ctx.fillRect(x + 4, y + 8, 28, 6)
    ctx.fillRect(x + 8, y + 16, 6, 8)
    ctx.fillRect(x + 22, y + 16, 6, 8)
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(x + 10, y + 7, 4, 4)
    ctx.fillRect(x + 22, y + 7, 4, 4)
  } else {
    ctx.fillRect(x + 8, y + 2, 20, 4)
    ctx.fillRect(x + 4, y + 6, 28, 12)
    ctx.fillRect(x + 2, y + 10, 32, 4)
    if (frame === 0) {
      ctx.fillRect(x + 4, y + 18, 4, 6)
      ctx.fillRect(x + 14, y + 18, 4, 6)
      ctx.fillRect(x + 18, y + 18, 4, 6)
      ctx.fillRect(x + 28, y + 18, 4, 6)
    } else {
      ctx.fillRect(x + 2, y + 18, 4, 6)
      ctx.fillRect(x + 10, y + 18, 4, 6)
      ctx.fillRect(x + 22, y + 18, 4, 6)
      ctx.fillRect(x + 30, y + 18, 4, 6)
    }
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(x + 10, y + 8, 4, 4)
    ctx.fillRect(x + 22, y + 8, 4, 4)
  }
  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, invincible: number) {
  if (invincible > 0 && Math.floor(invincible / 8) % 2 === 0) return
  ctx.save()
  ctx.fillStyle = PLAYER_COLOR
  ctx.fillRect(x, y + PLAYER_H - 6, PLAYER_W, 6)
  ctx.fillRect(x + 6, y + 6, PLAYER_W - 12, PLAYER_H - 6)
  ctx.fillRect(x + PLAYER_W / 2 - 3, y, 6, 10)
  ctx.restore()
}

function drawShield(ctx: CanvasRenderingContext2D, shield: Shield) {
  ctx.save()
  for (let r = 0; r < SHIELD_SEGMENTS_H; r++) {
    for (let c = 0; c < SHIELD_SEGMENTS_W; c++) {
      if (shield.segments[r][c]) {
        const brightness = 0.6 + 0.4 * (r / SHIELD_SEGMENTS_H)
        ctx.fillStyle = SHIELD_COLOR
        ctx.globalAlpha = brightness
        ctx.fillRect(
          shield.x + c * SEGMENT_SIZE,
          shield.y + r * SEGMENT_SIZE,
          SEGMENT_SIZE - 1,
          SEGMENT_SIZE - 1
        )
      }
    }
  }
  ctx.restore()
}

function drawScene(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  for (let i = 0; i < 80; i++) {
    ctx.fillRect(
      (i * 173 + 7) % CANVAS_W,
      (i * 97 + 13) % (CANVAS_H * 0.85),
      1, 1
    )
  }

  ctx.fillStyle = '#00ff88'
  ctx.fillRect(0, CANVAS_H - 42, CANVAS_W, 2)

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    const ex = enemy.col * (ENEMY_W + ENEMY_GAP_X) + state.enemyOffsetX
    const ey = enemy.row * (ENEMY_H + ENEMY_GAP_Y) + state.enemyOffsetY + 60
    drawEnemy(ctx, enemy.type, ex, ey, enemy.frame)
  }

  if (state.ufo.active) {
    const ux = state.ufo.x
    const uy = 22
    ctx.save()
    ctx.fillStyle = UFO_COLOR
    ctx.beginPath()
    ctx.ellipse(ux, uy + 8, 28, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff8888'
    ctx.beginPath()
    ctx.ellipse(ux, uy + 4, 14, 8, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#ffff00'
    ctx.fillRect(ux - 20, uy + 10, 4, 3)
    ctx.fillRect(ux - 4, uy + 12, 4, 3)
    ctx.fillRect(ux + 12, uy + 10, 4, 3)
    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(UFO_SCORE), ux, uy - 5)
    ctx.restore()
  }

  for (const shield of state.shields) {
    drawShield(ctx, shield)
  }

  drawPlayer(ctx, state.player.x, CANVAS_H - 60 - PLAYER_H, state.playerInvincible)

  for (const bullet of state.bullets) {
    if (!bullet.active) continue
    ctx.fillStyle = BULLET_COLOR
    ctx.fillRect(bullet.x - 1, bullet.y - 4, 3, 10)
  }

  for (const bullet of state.enemyBullets) {
    if (!bullet.active) continue
    ctx.fillStyle = ENEMY_BULLET_COLOR
    const zigzag = Math.floor(bullet.y / 4) % 2 === 0 ? -2 : 2
    ctx.fillRect(bullet.x + zigzag - 1, bullet.y - 3, 3, 8)
  }

  ctx.fillStyle = PLAYER_COLOR
  for (let i = 0; i < state.lives; i++) {
    const lx = 10 + i * 44
    const ly = CANVAS_H - 28
    ctx.fillRect(lx, ly + 10, PLAYER_W * 0.7, 4)
    ctx.fillRect(lx + 4, ly + 4, PLAYER_W * 0.7 - 8, 10)
    ctx.fillRect(lx + PLAYER_W * 0.7 / 2 - 2, ly, 4, 6)
  }
}

export function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [screen, setScreen] = useState<'menu' | 'playing' | 'gameover' | 'levelcomplete'>('menu')
  const [displayScore, setDisplayScore] = useState(0)
  const [_displayLives, setDisplayLives] = useState(3)
  const [_displayLevel, setDisplayLevel] = useState(1)
  const [highScore, setHighScore] = useState(0)

  const stateRef = useRef<GameState>(initGame(1))
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number | null>(null)

  function startGame(level: number) {
    stateRef.current = initGame(level)
    setDisplayScore(0)
    setDisplayLives(3)
    setDisplayLevel(level)
    setScreen('playing')
  }

  useEffect(() => {
    if (screen !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault()
      }
      keysRef.current.add(e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    let prevTime = performance.now()

    function loop(time: number) {
      const dt = time - prevTime
      prevTime = time

      let accum = dt
      while (accum >= TICK_MS) {
        stateRef.current = tickGame(stateRef.current, keysRef.current)
        accum -= TICK_MS
      }

      const state = stateRef.current
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawScene(ctx, state)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 16px monospace'
          ctx.textAlign = 'left'
          ctx.fillText('SCORE: ' + state.score, 10, 22)
          ctx.textAlign = 'right'
          ctx.fillText('LEVEL ' + state.level, CANVAS_W - 10, 22)
          if (highScore > 0) {
            ctx.fillStyle = '#ffdd00'
            ctx.textAlign = 'center'
            ctx.fillText('HI: ' + highScore, CANVAS_W / 2, 22)
          }
        }
      }

      setDisplayScore(state.score)
      setDisplayLives(state.lives)

      if (state.gameOver) {
        setHighScore(h => Math.max(h, state.score))
        setScreen('gameover')
        return
      }
      if (state.won) {
        setHighScore(h => Math.max(h, state.score))
        setScreen('levelcomplete')
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [screen])

  if (screen === 'menu') {
    return (
      <div style={styles.root}>
        <div style={styles.menu}>
          <div style={styles.ufoIcon}>🛸</div>
          <h1 style={styles.title}>SPACE INVADERS</h1>
          <p style={styles.subtitle}>Defend Earth from the alien armada!</p>
          {highScore > 0 && (
            <p style={{ color: '#ffdd00', marginBottom: 12 }}>HIGH SCORE: {highScore}</p>
          )}
          <div style={{ marginBottom: 24 }}>
            <button style={styles.menuBtn} onClick={() => startGame(1)}>
              ▶ Start Game
            </button>
          </div>
          <div style={styles.instructions}>
            <h3 style={{ marginTop: 0, color: '#00aaff' }}>Controls</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr><td style={styles.keyCell}>← / A</td><td>Move Left</td></tr>
                <tr><td style={styles.keyCell}>→ / D</td><td>Move Right</td></tr>
                <tr><td style={styles.keyCell}>Space / ↑</td><td>Fire</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#ff4488' }}>▲ Squid: 30 pts</div>
              <div style={{ color: '#44aaff' }}>◆ Crab: 20 pts</div>
              <div style={{ color: '#88ff44' }}>● Octopus: 10 pts</div>
              <div style={{ color: '#ff2222' }}>🛸 UFO: 150 pts</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'gameover') {
    return (
      <div style={styles.root}>
        <div style={styles.menu}>
          <h1 style={{ ...styles.title, color: '#ff4444' }}>GAME OVER</h1>
          <p style={styles.subtitle}>Final Score: {displayScore}</p>
          {highScore > 0 && <p style={{ color: '#ffdd00' }}>HIGH SCORE: {highScore}</p>}
          <button style={styles.menuBtn} onClick={() => startGame(1)}>▶ Play Again</button>
          <button style={{ ...styles.menuBtn, marginTop: 8 }} onClick={() => setScreen('menu')}>Main Menu</button>
        </div>
      </div>
    )
  }

  if (screen === 'levelcomplete') {
    const nextLevel = stateRef.current.level + 1
    return (
      <div style={styles.root}>
        <div style={styles.menu}>
          <h1 style={{ ...styles.title, color: '#00ff88' }}>WAVE CLEAR!</h1>
          <p style={styles.subtitle}>Score: {displayScore}</p>
          {highScore > 0 && <p style={{ color: '#ffdd00' }}>HIGH SCORE: {highScore}</p>}
          <button style={styles.menuBtn} onClick={() => {
            const s = stateRef.current
            const newState = initGame(nextLevel)
            newState.score = s.score
            newState.lives = s.lives
            stateRef.current = newState
            setDisplayLevel(nextLevel)
            setScreen('playing')
          }}>
            ▶ Wave {nextLevel}
          </button>
          <button style={{ ...styles.menuBtn, marginTop: 8 }} onClick={() => setScreen('menu')}>Main Menu</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <div style={styles.gameContainer}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={styles.canvas}
        />
        <div style={styles.hint}>
          ← A / → D to move · Space or ↑ to fire
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw', height: '100vh',
    background: '#0a0a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Courier New", monospace', color: '#fff', overflow: 'auto',
  },
  menu: {
    textAlign: 'center', maxWidth: 480, padding: 32,
    background: '#0f0f2a', borderRadius: 16, border: '2px solid #ff2222',
  },
  title: { fontSize: 40, margin: '0 0 8px', color: '#ff4444', textShadow: '0 0 20px #ff0000' },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 16 },
  ufoIcon: { fontSize: 48, marginBottom: 8 },
  menuBtn: {
    display: 'block', width: '100%', padding: '12px 16px', marginBottom: 8,
    background: '#1a0a0a', color: '#ff8888', border: '2px solid #ff4444',
    borderRadius: 8, cursor: 'pointer', fontSize: 16, textAlign: 'center',
    fontFamily: '"Courier New", monospace',
  },
  instructions: {
    textAlign: 'left', background: '#08080f', padding: 16,
    borderRadius: 8, fontSize: 13, color: '#ccc', marginTop: 16,
  },
  keyCell: {
    fontWeight: 'bold', color: '#ffdd00',
    padding: '2px 12px 2px 0', minWidth: 100,
  } as React.CSSProperties,
  gameContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  canvas: { display: 'block', border: '2px solid #333', cursor: 'default' },
  hint: {
    width: CANVAS_W, padding: '4px 12px', background: '#0a0a1a',
    color: '#555', fontSize: 12, textAlign: 'center', border: '2px solid #333', borderTop: 'none',
  },
}
