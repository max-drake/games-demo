import { useEffect, useRef, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 800
const CANVAS_H = 480
const LEMMING_W = 10
const LEMMING_H = 14
const GRAVITY = 0.5
const WALK_SPEED = 1.5
const FALL_DEATH_HEIGHT = 180
const BUILDER_STEPS = 12
const BUILD_STEP_W = 6
const BUILD_STEP_H = 2
const TICK_MS = 33

type SkillName =
	| 'walker'
	| 'climber'
	| 'floater'
	| 'bomber'
	| 'blocker'
	| 'builder'
	| 'basher'
	| 'digger'

type LemmingState =
	| 'walking'
	| 'falling'
	| 'climbing'
	| 'floating'
	| 'building'
	| 'bashing'
	| 'digging'
	| 'blocking'
	| 'exploding'
	| 'dead'
	| 'saved'

interface Lemming {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	dir: 1 | -1
	state: LemmingState
	skill: SkillName
	fallDistance: number
	buildStepsLeft: number
	buildTimer: number
	bashTimer: number
	digTimer: number
	explodeTimer: number
	exploding: boolean
	umbrellaOpen: boolean
	climbTimer: number
	frame: number
}

interface Level {
	name: string
	terrain: boolean[][]
	spawnX: number
	spawnY: number
	exitX: number
	exitY: number
	totalLemmings: number
	saveGoal: number
	releaseRate: number
	skills: Record<SkillName, number>
	timeLimit: number
}

function makeTerrain(w: number, h: number): boolean[][] {
	const t: boolean[][] = []
	for (let y = 0; y < h; y++) {
		t[y] = new Array(w).fill(false)
	}
	return t
}

function fillRect(t: boolean[][], x: number, y: number, w: number, h: number, val: boolean) {
	const rows = t.length
	const cols = t[0].length
	for (let dy = 0; dy < h; dy++) {
		for (let dx = 0; dx < w; dx++) {
			const ry = y + dy
			const rx = x + dx
			if (ry >= 0 && ry < rows && rx >= 0 && rx < cols) {
				t[ry][rx] = val
			}
		}
	}
}

function isSolid(t: boolean[][], x: number, y: number): boolean {
	const rows = t.length
	const cols = t[0].length
	const ix = Math.floor(x)
	const iy = Math.floor(y)
	if (ix < 0 || ix >= cols || iy < 0 || iy >= rows) return false
	return t[iy][ix]
}

function buildLevel1(): Level {
	const W = CANVAS_W
	const H = CANVAS_H
	const terrain = makeTerrain(W, H)
	fillRect(terrain, 0, H - 30, W, 30, true)
	fillRect(terrain, 500, H - 120, 200, 20, true)
	fillRect(terrain, 380, H - 90, 20, 90, true)
	fillRect(terrain, 200, H - 30, 80, 30, false)
	fillRect(terrain, 0, H - 100, 150, 20, true)
	return {
		name: 'Just a walk in the park',
		terrain,
		spawnX: 60,
		spawnY: H - 120,
		exitX: 620,
		exitY: H - 140,
		totalLemmings: 10,
		saveGoal: 6,
		releaseRate: 90,
		skills: { walker: 0, climber: 1, floater: 2, bomber: 1, blocker: 2, builder: 5, basher: 2, digger: 2 },
		timeLimit: 300,
	}
}

function buildLevel2(): Level {
	const W = CANVAS_W
	const H = CANVAS_H
	const terrain = makeTerrain(W, H)
	fillRect(terrain, 0, H - 20, W, 20, true)
	fillRect(terrain, 150, H - 80, 30, 80, true)
	fillRect(terrain, 300, H - 140, 30, 140, true)
	fillRect(terrain, 500, H - 80, 30, 80, true)
	fillRect(terrain, 50, H - 120, 80, 15, true)
	fillRect(terrain, 200, H - 160, 80, 15, true)
	fillRect(terrain, 370, H - 200, 100, 15, true)
	fillRect(terrain, 560, H - 120, 120, 15, true)
	fillRect(terrain, 680, H - 20, 80, 20, false)
	return {
		name: 'Building bridges',
		terrain,
		spawnX: 30,
		spawnY: H - 140,
		exitX: 750,
		exitY: H - 40,
		totalLemmings: 12,
		saveGoal: 8,
		releaseRate: 100,
		skills: { walker: 0, climber: 2, floater: 2, bomber: 2, blocker: 3, builder: 8, basher: 3, digger: 3 },
		timeLimit: 300,
	}
}

const LEVELS: Level[] = [buildLevel1(), buildLevel2()]

function createLemming(id: number, x: number, y: number): Lemming {
	return {
		id, x, y,
		vx: WALK_SPEED, vy: 0,
		dir: 1,
		state: 'falling',
		skill: 'walker',
		fallDistance: 0,
		buildStepsLeft: 0, buildTimer: 0,
		bashTimer: 0, digTimer: 0,
		explodeTimer: 0, exploding: false,
		umbrellaOpen: false,
		climbTimer: 0,
		frame: 0,
	}
}

function explodeTerrain(terrain: boolean[][], cx: number, cy: number, radius: number) {
	for (let dy = -radius; dy <= radius; dy++) {
		for (let dx = -radius; dx <= radius; dx++) {
			if (dx * dx + dy * dy <= radius * radius) {
				const tx = Math.floor(cx + dx)
				const ty = Math.floor(cy + dy)
				if (ty >= 0 && ty < terrain.length && tx >= 0 && tx < terrain[0].length) {
					terrain[ty][tx] = false
				}
			}
		}
	}
}

function tickLemming(
	lem: Lemming,
	terrain: boolean[][],
	allLemmings: Lemming[],
	onSaved: (id: number) => void,
	exitX: number,
	exitY: number
): void {
	if (lem.state === 'dead' || lem.state === 'saved') return
	lem.frame++

	if (lem.exploding) {
		lem.explodeTimer--
		if (lem.explodeTimer <= 0) {
			explodeTerrain(terrain, lem.x, lem.y, 20)
			lem.state = 'dead'
			return
		}
	}

	const H = terrain.length
	const W = terrain[0].length

	if (lem.y >= H) { lem.state = 'dead'; return }

	const edx = Math.abs(lem.x - exitX)
	const edy = Math.abs(lem.y - exitY)
	if (edx < 20 && edy < 30) {
		lem.state = 'saved'
		onSaved(lem.id)
		return
	}

	switch (lem.state) {
		case 'falling': {
			lem.vy = Math.min(lem.vy + GRAVITY, 10)
			lem.y += lem.vy
			lem.fallDistance += lem.vy
			const nextX = lem.x + lem.vx * 0.5
			if (nextX >= 0 && nextX < W) lem.x = nextX
			const footY = Math.floor(lem.y)
			if (isSolid(terrain, lem.x, footY) || isSolid(terrain, lem.x, footY + 1)) {
				let landY = footY
				while (landY > 0 && isSolid(terrain, lem.x, landY - 1)) landY--
				lem.y = landY
				lem.vy = 0
				if (!lem.umbrellaOpen && lem.fallDistance > FALL_DEATH_HEIGHT) {
					lem.state = 'dead'
				} else {
					lem.fallDistance = 0
					lem.umbrellaOpen = false
					lem.state = 'walking'
					lem.vx = WALK_SPEED * lem.dir
				}
			}
			break
		}
		case 'floating': {
			lem.vy = Math.min(lem.vy + GRAVITY * 0.1, 1.5)
			lem.y += lem.vy
			lem.umbrellaOpen = true
			const footY = Math.floor(lem.y)
			if (isSolid(terrain, lem.x, footY) || isSolid(terrain, lem.x, footY + 1)) {
				let landY = footY
				while (landY > 0 && isSolid(terrain, lem.x, landY - 1)) landY--
				lem.y = landY
				lem.vy = 0
				lem.fallDistance = 0
				lem.umbrellaOpen = false
				lem.state = 'walking'
				lem.vx = WALK_SPEED * lem.dir
			}
			if (lem.y >= H) lem.state = 'dead'
			break
		}
		case 'walking': {
			lem.vx = WALK_SPEED * lem.dir
			const newX = lem.x + lem.vx
			const footY = Math.floor(lem.y)
			const midY = Math.floor(lem.y - LEMMING_H / 2)

			for (const other of allLemmings) {
				if (other.id !== lem.id && other.state === 'blocking') {
					if (Math.abs(other.x - newX) < LEMMING_W * 1.2 && Math.abs(other.y - lem.y) < LEMMING_H) {
						lem.dir = lem.dir === 1 ? -1 : 1
						lem.vx = WALK_SPEED * lem.dir
						break
					}
				}
			}

			const wallCheck = isSolid(terrain, newX, footY - 1) || isSolid(terrain, newX, midY)
			if (wallCheck) {
				if (lem.skill === 'climber') {
					lem.state = 'climbing'
					lem.climbTimer = 0
					break
				}
				let stepped = false
				for (let stepUp = 1; stepUp <= 4; stepUp++) {
					if (!isSolid(terrain, newX, footY - stepUp)) {
						lem.x = newX
						lem.y = footY - stepUp
						stepped = true
						break
					}
				}
				if (!stepped) {
					lem.dir = lem.dir === 1 ? -1 : 1
				}
			} else if (newX >= 0 && newX < W) {
				lem.x = newX
			} else {
				lem.dir = lem.dir === 1 ? -1 : 1
			}

			const nfY = Math.floor(lem.y)
			if (!isSolid(terrain, lem.x, nfY) && !isSolid(terrain, lem.x, nfY + 1)) {
				let foundGround = false
				for (let stepDown = 1; stepDown <= 3; stepDown++) {
					if (isSolid(terrain, lem.x, nfY + stepDown)) {
						lem.y = nfY + stepDown
						foundGround = true
						break
					}
				}
				if (!foundGround) {
					lem.vy = 0
					lem.fallDistance = 0
					lem.state = lem.skill === 'floater' ? 'floating' : 'falling'
				}
			}
			break
		}
		case 'climbing': {
			lem.climbTimer++
			const footY = Math.floor(lem.y)
			if (!isSolid(terrain, lem.x, footY - LEMMING_H - 1)) {
				lem.y--
			}
			if (!isSolid(terrain, lem.x + lem.dir * 1, footY - 1)) {
				lem.state = 'walking'
			}
			if (!isSolid(terrain, lem.x + lem.dir * 2, footY - LEMMING_H)) {
				lem.x += lem.dir * 2
				lem.state = 'walking'
			}
			break
		}
		case 'building': {
			lem.buildTimer++
			if (lem.buildTimer >= 6) {
				lem.buildTimer = 0
				if (lem.buildStepsLeft <= 0) { lem.state = 'walking'; break }
				const stepX = Math.floor(lem.x)
				const stepY = Math.floor(lem.y) - 1
				for (let bx = 0; bx < BUILD_STEP_W; bx++) {
					for (let by = 0; by < BUILD_STEP_H; by++) {
						const tx = stepX + lem.dir * bx
						const ty = stepY + by
						if (ty >= 0 && ty < H && tx >= 0 && tx < W) terrain[ty][tx] = true
					}
				}
				lem.x += lem.dir * BUILD_STEP_W
				lem.y -= BUILD_STEP_H
				lem.buildStepsLeft--
				if (lem.buildStepsLeft <= 0) lem.state = 'walking'
			}
			break
		}
		case 'bashing': {
			lem.bashTimer++
			if (lem.bashTimer >= 4) {
				lem.bashTimer = 0
				const bx = Math.floor(lem.x + lem.dir * 3)
				const by = Math.floor(lem.y)
				for (let ddy = -LEMMING_H + 2; ddy <= 2; ddy++) {
					for (let ddx = 0; ddx < 4; ddx++) {
						const tx = bx + lem.dir * ddx
						const ty = by + ddy
						if (ty >= 0 && ty < H && tx >= 0 && tx < W) terrain[ty][tx] = false
					}
				}
				lem.x += lem.dir * 2
			}
			const bfY = Math.floor(lem.y)
			if (!isSolid(terrain, lem.x + lem.dir * 4, bfY - 2)) lem.state = 'walking'
			if (!isSolid(terrain, lem.x, bfY) && !isSolid(terrain, lem.x, bfY + 1)) {
				lem.vy = 0
				lem.state = lem.skill === 'floater' ? 'floating' : 'falling'
			}
			break
		}
		case 'digging': {
			lem.digTimer++
			if (lem.digTimer >= 4) {
				lem.digTimer = 0
				const cx = Math.floor(lem.x)
				const cy = Math.floor(lem.y)
				for (let dx2 = -LEMMING_W / 2; dx2 <= LEMMING_W / 2; dx2++) {
					for (let dy2 = 0; dy2 < 3; dy2++) {
						const tx = cx + dx2
						const ty = cy + dy2
						if (ty >= 0 && ty < H && tx >= 0 && tx < W) terrain[ty][tx] = false
					}
				}
				lem.y += 2
			}
			const dfY = Math.floor(lem.y)
			if (!isSolid(terrain, lem.x, dfY) && !isSolid(terrain, lem.x, dfY + 1)) {
				lem.vy = 0
				lem.state = lem.skill === 'floater' ? 'floating' : 'falling'
			}
			break
		}
		case 'blocking':
			break
	}
}

const TERRAIN_COLOR = '#8B6914'
const TERRAIN_GRASS_COLOR = '#4a8c2a'
const SKY_COLOR = '#1a1a3e'

const LEMMING_COLORS: Record<LemmingState, string> = {
	walking: '#00aaff',
	falling: '#00aaff',
	climbing: '#00ccff',
	floating: '#aaddff',
	building: '#ffdd00',
	bashing: '#ff8800',
	digging: '#ff4400',
	blocking: '#ff00ff',
	exploding: '#ff0000',
	dead: '#555555',
	saved: '#00ff88',
}

function drawLemming(ctx: CanvasRenderingContext2D, lem: Lemming) {
	if (lem.state === 'dead') return
	const x = Math.floor(lem.x)
	const y = Math.floor(lem.y)
	const color = LEMMING_COLORS[lem.state]
	ctx.save()
	ctx.fillStyle = color
	ctx.fillRect(x - LEMMING_W / 2, y - LEMMING_H, LEMMING_W, LEMMING_H - 3)
	ctx.fillStyle = '#ffe0c0'
	ctx.beginPath()
	ctx.arc(x, y - LEMMING_H - 1, 4, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = '#0044ff'
	ctx.fillRect(x - 4, y - LEMMING_H - 7, 8, 4)
	if (['walking', 'building', 'bashing', 'digging'].includes(lem.state)) {
		const legPhase = Math.floor(lem.frame / 4) % 2
		ctx.fillStyle = '#0066cc'
		if (legPhase === 0) {
			ctx.fillRect(x - 3, y - 3, 2, 3)
			ctx.fillRect(x + 1, y - 5, 2, 5)
		} else {
			ctx.fillRect(x - 3, y - 5, 2, 5)
			ctx.fillRect(x + 1, y - 3, 2, 3)
		}
	}
	if (lem.umbrellaOpen || lem.state === 'floating') {
		ctx.fillStyle = '#ff88ff'
		ctx.beginPath()
		ctx.arc(x, y - LEMMING_H - 10, 10, Math.PI, 0)
		ctx.fill()
		ctx.strokeStyle = '#ff88ff'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(x - 8, y - LEMMING_H - 10)
		ctx.lineTo(x, y - LEMMING_H - 5)
		ctx.moveTo(x + 8, y - LEMMING_H - 10)
		ctx.lineTo(x, y - LEMMING_H - 5)
		ctx.stroke()
	}
	if (lem.exploding && lem.explodeTimer > 0) {
		ctx.fillStyle = '#ffffff'
		ctx.font = 'bold 10px monospace'
		ctx.textAlign = 'center'
		ctx.fillText(String(Math.ceil(lem.explodeTimer / 30)), x, y - LEMMING_H - 14)
	}
	ctx.fillStyle = 'rgba(255,255,255,0.4)'
	ctx.fillRect(x + lem.dir * 3, y - LEMMING_H + 2, 2, 2)
	ctx.restore()
}

function drawTerrain(ctx: CanvasRenderingContext2D, terrain: boolean[][], cameraX: number) {
	const H = terrain.length
	const W = terrain[0].length
	const startX = Math.max(0, Math.floor(cameraX))
	const endX = Math.min(W, Math.ceil(cameraX + CANVAS_W))
	for (let x = startX; x < endX; x++) {
		let runStart = -1
		let isGrass = false
		for (let y = 0; y < H; y++) {
			if (terrain[y][x]) {
				if (runStart === -1) {
					runStart = y
					isGrass = y === 0 || !terrain[y - 1][x]
				}
			} else {
				if (runStart !== -1) {
					const drawX = x - cameraX
					if (isGrass) {
						ctx.fillStyle = TERRAIN_GRASS_COLOR
						ctx.fillRect(drawX, runStart, 1, 2)
						ctx.fillStyle = TERRAIN_COLOR
						ctx.fillRect(drawX, runStart + 2, 1, y - runStart - 2)
					} else {
						ctx.fillStyle = TERRAIN_COLOR
						ctx.fillRect(drawX, runStart, 1, y - runStart)
					}
					runStart = -1
				}
			}
		}
		if (runStart !== -1) {
			const drawX = x - cameraX
			ctx.fillStyle = TERRAIN_COLOR
			ctx.fillRect(drawX, runStart, 1, H - runStart)
		}
	}
}

function drawExit(ctx: CanvasRenderingContext2D, exitX: number, exitY: number, cameraX: number) {
	const x = exitX - cameraX
	const y = exitY
	ctx.save()
	ctx.fillStyle = '#00ff88'
	ctx.fillRect(x - 15, y - 40, 30, 40)
	ctx.fillStyle = '#00cc66'
	ctx.fillRect(x - 18, y - 44, 36, 8)
	ctx.fillStyle = '#ffffff'
	ctx.font = 'bold 14px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('EXIT', x, y - 50)
	ctx.restore()
}

function drawSpawn(ctx: CanvasRenderingContext2D, spawnX: number, spawnY: number, cameraX: number) {
	const x = spawnX - cameraX
	const y = spawnY
	ctx.save()
	ctx.fillStyle = '#ffdd00'
	ctx.fillRect(x - 10, y - 30, 20, 20)
	ctx.fillStyle = '#ff8800'
	ctx.font = '10px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('IN', x, y - 15)
	ctx.restore()
}

const SKILL_DISPLAY: { skill: SkillName; label: string; color: string }[] = [
	{ skill: 'climber', label: 'Climb', color: '#00ccff' },
	{ skill: 'floater', label: 'Float', color: '#aaddff' },
	{ skill: 'bomber', label: 'Bomb', color: '#ff4444' },
	{ skill: 'blocker', label: 'Block', color: '#ff00ff' },
	{ skill: 'builder', label: 'Build', color: '#ffdd00' },
	{ skill: 'basher', label: 'Bash', color: '#ff8800' },
	{ skill: 'digger', label: 'Dig', color: '#ff4400' },
]

const SKILL_ICONS: Record<string, string> = {
	climber: '🧗', floater: '☂️', bomber: '💣', blocker: '🚫',
	builder: '🏗️', basher: '⛏️', digger: '⬇️',
}

export function Lemmings() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [levelIndex, setLevelIndex] = useState(0)
	const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu')
	const [savedCount, setSavedCount] = useState(0)
	const [deadCount, setDeadCount] = useState(0)
	const [timeLeft, setTimeLeft] = useState(300)
	const [selectedSkill, setSelectedSkill] = useState<SkillName>('builder')
	const [skills, setSkills] = useState<Record<SkillName, number>>({
		walker: 0, climber: 0, floater: 0, bomber: 0, blocker: 0, builder: 0, basher: 0, digger: 0,
	})
	const [spawnedCount, setSpawnedCount] = useState(0)
	const [showNukeConfirm, setShowNukeConfirm] = useState(false)

	const gameRef = useRef<{
		lemmings: Lemming[]
		terrain: boolean[][] | null
		level: Level | null
		savedIds: Set<number>
		tickCount: number
		spawnCount: number
		cameraX: number
		ticksSinceTimer: number
	}>({
		lemmings: [], terrain: null, level: null,
		savedIds: new Set(), tickCount: 0, spawnCount: 0,
		cameraX: 0, ticksSinceTimer: 0,
	})

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	function startLevel(idx: number) {
		if (intervalRef.current) clearInterval(intervalRef.current)
		const level = LEVELS[idx]
		const terrain = level.terrain.map(row => [...row])
		gameRef.current = {
			lemmings: [], terrain, level,
			savedIds: new Set(), tickCount: 0, spawnCount: 0,
			cameraX: 0, ticksSinceTimer: 0,
		}
		setLevelIndex(idx)
		setSavedCount(0)
		setDeadCount(0)
		setTimeLeft(level.timeLimit)
		setSkills({ ...level.skills })
		setSpawnedCount(0)
		setSelectedSkill('builder')
		setShowNukeConfirm(false)
		setGameState('playing')
	}

	function handleNuke() {
		const g = gameRef.current
		for (const lem of g.lemmings) {
			if (lem.state !== 'dead' && lem.state !== 'saved' && !lem.exploding) {
				lem.exploding = true
				lem.explodeTimer = 30 + Math.floor(Math.random() * 60)
			}
		}
		setShowNukeConfirm(false)
	}

	function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
		if (gameState !== 'playing') return
		const g = gameRef.current
		if (!g.level) return
		const rect = canvasRef.current!.getBoundingClientRect()
		const scaleX = CANVAS_W / rect.width
		const scaleY = CANVAS_H / rect.height
		const clickX = (e.clientX - rect.left) * scaleX + g.cameraX
		const clickY = (e.clientY - rect.top) * scaleY

		let nearest: Lemming | null = null
		let nearestDist = 20
		for (const lem of g.lemmings) {
			if (lem.state === 'dead' || lem.state === 'saved') continue
			const dist = Math.sqrt((lem.x - clickX) ** 2 + (lem.y - clickY) ** 2)
			if (dist < nearestDist) { nearestDist = dist; nearest = lem }
		}
		if (!nearest) return

		const sk = selectedSkill
		if (sk === 'walker' || skills[sk] <= 0) return

		switch (sk) {
			case 'climber':
				if (nearest.skill !== 'climber') {
					nearest.skill = 'climber'
					setSkills(s => ({ ...s, climber: s.climber - 1 }))
				}
				break
			case 'floater':
				if (nearest.skill !== 'floater') {
					nearest.skill = 'floater'
					setSkills(s => ({ ...s, floater: s.floater - 1 }))
				}
				break
			case 'bomber':
				if (!nearest.exploding) {
					nearest.exploding = true
					nearest.explodeTimer = 30 * 5
					setSkills(s => ({ ...s, bomber: s.bomber - 1 }))
				}
				break
			case 'blocker':
				if (nearest.state !== 'blocking') {
					nearest.state = 'blocking'
					nearest.vx = 0
					setSkills(s => ({ ...s, blocker: s.blocker - 1 }))
				}
				break
			case 'builder':
				if (nearest.state === 'walking') {
					nearest.state = 'building'
					nearest.buildStepsLeft = BUILDER_STEPS
					nearest.buildTimer = 0
					setSkills(s => ({ ...s, builder: s.builder - 1 }))
				}
				break
			case 'basher':
				if (nearest.state === 'walking') {
					nearest.state = 'bashing'
					nearest.bashTimer = 0
					setSkills(s => ({ ...s, basher: s.basher - 1 }))
				}
				break
			case 'digger':
				if (nearest.state === 'walking') {
					nearest.state = 'digging'
					nearest.digTimer = 0
					setSkills(s => ({ ...s, digger: s.digger - 1 }))
				}
				break
		}
	}

	useEffect(() => {
		if (gameState !== 'playing') return
		const g = gameRef.current
		const level = g.level!

		intervalRef.current = setInterval(() => {
			if (!g.terrain) return
			g.tickCount++
			g.ticksSinceTimer++

			if (g.spawnCount < level.totalLemmings && g.tickCount % level.releaseRate === 0) {
				const lem = createLemming(g.spawnCount, level.spawnX, level.spawnY - 5)
				g.lemmings.push(lem)
				g.spawnCount++
				setSpawnedCount(g.spawnCount)
			}

			if (g.ticksSinceTimer >= 30) {
				g.ticksSinceTimer = 0
				setTimeLeft(t => {
					const newT = t - 1
					if (newT <= 0) {
						if (g.savedIds.size >= level.saveGoal) setGameState('won')
						else setGameState('lost')
						return 0
					}
					return newT
				})
			}

			for (const lem of g.lemmings) {
				tickLemming(lem, g.terrain!, g.lemmings, (id) => {
					g.savedIds.add(id)
					setSavedCount(g.savedIds.size)
				}, level.exitX, level.exitY)
			}

			setDeadCount(g.lemmings.filter(l => l.state === 'dead').length)

			if (g.spawnCount >= level.totalLemmings) {
				const allDone = g.lemmings.every(l => l.state === 'dead' || l.state === 'saved')
				if (allDone) {
					if (g.savedIds.size >= level.saveGoal) setGameState('won')
					else setGameState('lost')
				}
			}

			const alive = g.lemmings.filter(l => l.state !== 'dead' && l.state !== 'saved')
			if (alive.length > 0) {
				const avgX = alive.reduce((s, l) => s + l.x, 0) / alive.length
				const targetCam = Math.max(0, Math.min(g.terrain![0].length - CANVAS_W, avgX - CANVAS_W / 2))
				g.cameraX += (targetCam - g.cameraX) * 0.05
			}

			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext('2d')
			if (!ctx) return

			ctx.fillStyle = SKY_COLOR
			ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

			ctx.fillStyle = 'rgba(255,255,255,0.3)'
			for (let i = 0; i < 50; i++) {
				ctx.fillRect((i * 137 + g.tickCount * 0.1) % CANVAS_W, (i * 97) % (CANVAS_H * 0.6), 1, 1)
			}

			drawTerrain(ctx, g.terrain!, g.cameraX)
			drawExit(ctx, level.exitX, level.exitY, g.cameraX)
			drawSpawn(ctx, level.spawnX, level.spawnY, g.cameraX)

			for (const lem of g.lemmings) {
				if (lem.state !== 'dead' && lem.state !== 'saved') {
					const screenX = lem.x - g.cameraX
					if (screenX > -20 && screenX < CANVAS_W + 20) {
						drawLemming(ctx, { ...lem, x: lem.x - g.cameraX })
					}
				}
			}
		}, TICK_MS)

		return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
	}, [gameState])

	const level = LEVELS[levelIndex]

	if (gameState === 'menu') {
		return (
			<div style={styles.root}>
				<div style={styles.menu}>
					<h1 style={styles.title}>LEMMINGS</h1>
					<p style={styles.subtitle}>Save the lemmings from certain doom!</p>
					<div style={{ marginBottom: 24 }}>
						{LEVELS.map((lv, i) => (
							<button key={i} style={styles.menuBtn} onClick={() => startLevel(i)}>
								Level {i + 1}: {lv.name} — Save {lv.saveGoal}/{lv.totalLemmings}
							</button>
						))}
					</div>
					<div style={styles.instructions}>
						<h3 style={{ marginTop: 0 }}>How to play</h3>
						<p>Click a skill button, then click a lemming to assign that skill.</p>
						<ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
							<li><b>Build</b> – builds a staircase bridge (cross gaps, scale walls)</li>
							<li><b>Bash</b> – digs through walls horizontally</li>
							<li><b>Dig</b> – digs straight down through terrain</li>
							<li><b>Block</b> – stands still and turns others around</li>
							<li><b>Climb</b> – climbs over walls</li>
							<li><b>Float</b> – survives high falls (umbrella)</li>
							<li><b>Bomb</b> – explodes after 5s, destroying terrain</li>
						</ul>
					</div>
				</div>
			</div>
		)
	}

	if (gameState === 'won') {
		return (
			<div style={styles.root}>
				<div style={styles.menu}>
					<h1 style={{ ...styles.title, color: '#00ff88' }}>LEVEL COMPLETE!</h1>
					<p style={styles.subtitle}>You saved {savedCount} lemmings! (goal: {level.saveGoal})</p>
					{levelIndex < LEVELS.length - 1 ? (
						<button style={styles.menuBtn} onClick={() => startLevel(levelIndex + 1)}>Next Level</button>
					) : (
						<p style={{ color: '#ffdd00', fontSize: 20 }}>You completed all levels!</p>
					)}
					<button style={{ ...styles.menuBtn, marginTop: 8 }} onClick={() => startLevel(levelIndex)}>Retry</button>
					<button style={{ ...styles.menuBtn, marginTop: 8 }} onClick={() => setGameState('menu')}>Main Menu</button>
				</div>
			</div>
		)
	}

	if (gameState === 'lost') {
		return (
			<div style={styles.root}>
				<div style={styles.menu}>
					<h1 style={{ ...styles.title, color: '#ff4444' }}>LEVEL FAILED</h1>
					<p style={styles.subtitle}>Saved {savedCount}/{level.saveGoal} lemmings</p>
					<button style={styles.menuBtn} onClick={() => startLevel(levelIndex)}>Try Again</button>
					<button style={{ ...styles.menuBtn, marginTop: 8 }} onClick={() => setGameState('menu')}>Main Menu</button>
				</div>
			</div>
		)
	}

	return (
		<div style={styles.root}>
			<div style={styles.gameContainer}>
				<div style={styles.hud}>
					<span style={styles.hudItem}>Saved: <b style={{ color: '#00ff88' }}>{savedCount}/{level.saveGoal}</b></span>
					<span style={styles.hudItem}>Dead: <b style={{ color: '#ff4444' }}>{deadCount}</b></span>
					<span style={styles.hudItem}>Out: <b>{spawnedCount}/{level.totalLemmings}</b></span>
					<span style={styles.hudItem}>Time: <b style={{ color: timeLeft < 30 ? '#ff4444' : '#fff' }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</b></span>
					<span style={{ flex: 1 }} />
					<span style={{ ...styles.hudItem, color: '#aaa' }}>{level.name}</span>
				</div>
				<canvas
					ref={canvasRef}
					width={CANVAS_W}
					height={CANVAS_H}
					style={styles.canvas}
					onClick={handleCanvasClick}
				/>
				<div style={styles.skillBar}>
					{SKILL_DISPLAY.map(({ skill, label, color }) => (
						<button
							key={skill}
							style={{
								...styles.skillBtn,
								background: selectedSkill === skill ? color : '#1e1e3a',
								color: selectedSkill === skill ? '#000' : '#ccc',
								opacity: skills[skill] === 0 ? 0.4 : 1,
								border: `2px solid ${selectedSkill === skill ? color : '#444'}`,
							}}
							onClick={() => setSelectedSkill(skill)}
						>
							<div style={{ fontSize: 20 }}>{SKILL_ICONS[skill]}</div>
							<div style={{ fontSize: 11 }}>{label}</div>
							<div style={{ fontSize: 13, fontWeight: 'bold' }}>{skills[skill]}</div>
						</button>
					))}
					<div style={{ flex: 1 }} />
					{!showNukeConfirm ? (
						<button style={{ ...styles.skillBtn, background: '#330000', color: '#ff8888', border: '2px solid #880000' }} onClick={() => setShowNukeConfirm(true)}>
							<div style={{ fontSize: 20 }}>☢️</div>
							<div style={{ fontSize: 11 }}>NUKE</div>
						</button>
					) : (
						<button style={{ ...styles.skillBtn, background: '#ff0000', color: '#fff', border: '2px solid #ff8888' }} onClick={handleNuke}>
							<div style={{ fontSize: 20 }}>☢️</div>
							<div style={{ fontSize: 10 }}>CONFIRM!</div>
						</button>
					)}
					<button style={{ ...styles.skillBtn, background: '#1e1e3a', color: '#ccc', border: '2px solid #444' }} onClick={() => setGameState('menu')}>
						<div style={{ fontSize: 20 }}>🏠</div>
						<div style={{ fontSize: 11 }}>Menu</div>
					</button>
				</div>
				<div style={styles.hint}>
					Selected: <b style={{ color: '#ffdd00' }}>{selectedSkill}</b> ({skills[selectedSkill]} left) — click a lemming to assign
				</div>
			</div>
		</div>
	)
}

const styles: Record<string, React.CSSProperties> = {
	root: {
		width: '100vw', height: '100vh',
		background: '#0d0d2b',
		display: 'flex', alignItems: 'center', justifyContent: 'center',
		fontFamily: '"Courier New", monospace', color: '#fff', overflow: 'auto',
	},
	menu: {
		textAlign: 'center', maxWidth: 560, padding: 32,
		background: '#1a1a3e', borderRadius: 16, border: '2px solid #4444aa',
	},
	title: { fontSize: 42, margin: '0 0 8px', color: '#00aaff', textShadow: '0 0 20px #0066ff' },
	subtitle: { fontSize: 16, color: '#aaa', marginBottom: 24 },
	menuBtn: {
		display: 'block', width: '100%', padding: '10px 16px', marginBottom: 8,
		background: '#2a2a5a', color: '#fff', border: '2px solid #4444aa',
		borderRadius: 8, cursor: 'pointer', fontSize: 15, textAlign: 'left',
	},
	instructions: {
		textAlign: 'left', background: '#12122a', padding: 16,
		borderRadius: 8, fontSize: 13, color: '#ccc', marginTop: 16,
	},
	gameContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
	hud: {
		width: CANVAS_W, background: '#0d0d2b', border: '2px solid #333', borderBottom: 'none',
		padding: '6px 12px', display: 'flex', gap: 20, alignItems: 'center',
	},
	hudItem: { fontSize: 13, color: '#ccc' },
	canvas: { display: 'block', cursor: 'crosshair', border: '2px solid #333' },
	skillBar: {
		width: CANVAS_W, background: '#0d0d2b', border: '2px solid #333', borderTop: '1px solid #444',
		padding: '4px 6px', display: 'flex', gap: 5, alignItems: 'center',
	},
	skillBtn: {
		minWidth: 56, height: 60, padding: '3px 5px',
		borderRadius: 6, cursor: 'pointer', fontSize: 12, textAlign: 'center',
	},
	hint: {
		width: CANVAS_W, padding: '3px 12px', background: '#0d0d2b',
		color: '#666', fontSize: 12, textAlign: 'center', border: '2px solid #333', borderTop: 'none',
	},
}
