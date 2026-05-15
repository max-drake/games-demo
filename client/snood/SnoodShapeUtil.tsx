/**
 * SnoodShapeUtil.tsx
 *
 * A custom tldraw ShapeUtil that renders the entire Snood bubble-shooter game
 * inside a tldraw HTML shape — NO HTML <canvas> element is used.
 * Bubbles are drawn as SVG <circle> elements; everything else is plain HTML/CSS.
 */

import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	useEditor,
} from 'tldraw'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { BubbleColor, randomColor } from './colors'
import { findCluster, popCluster } from './floodFill'
import {
	BUBBLE_RADIUS,
	Cell,
	COLS,
	ROWS,
	cellToPixel,
	createInitialGrid,
	getNeighbours,
	placeBubble,
} from './grid'
import { checkCollision } from './collision'
import { Projectile, computeVelocity, stepProjectile } from './physics'

// ---------------------------------------------------------------------------
// Augment tldraw's shape registry so our custom type is known
// ---------------------------------------------------------------------------

declare module '@tldraw/tlschema' {
	interface TLGlobalShapePropsMap {
		'snood-game': { w: number; h: number }
	}
}

// The shape type is now available as TLShape<'snood-game'>
export type SnoodGameShape = TLShape<'snood-game'>

// ---------------------------------------------------------------------------
// Canvas / layout constants
// ---------------------------------------------------------------------------

const CANVAS_W = COLS * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS * 2
const CANVAS_H = ROWS * (BUBBLE_RADIUS * 2 - 4) + BUBBLE_RADIUS * 4 + 80

const LAUNCHER_X = CANVAS_W / 2
const LAUNCHER_Y = CANVAS_H - BUBBLE_RADIUS * 2

// Shape dimensions (with padding around the SVG)
export const SHAPE_W = CANVAS_W + 32
export const SHAPE_H = CANVAS_H + 60

// ---------------------------------------------------------------------------
// Game state / reducer
// ---------------------------------------------------------------------------

interface GameState {
	grid: Cell[][]
	currentColor: BubbleColor
	nextColor: BubbleColor
	score: number
	level: number
	gameOver: boolean
	win: boolean
}

type Action = { type: 'FIRE_RESULT'; grid: Cell[][]; score: number } | { type: 'RESET' }

function initialState(): GameState {
	return {
		grid: createInitialGrid(5),
		currentColor: randomColor(),
		nextColor: randomColor(),
		score: 0,
		level: 1,
		gameOver: false,
		win: false,
	}
}

function reducer(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'FIRE_RESULT': {
			const hasAnyBubble = action.grid.some((row) => row.some((cell) => cell !== null))
			return {
				...state,
				grid: action.grid,
				currentColor: state.nextColor,
				nextColor: randomColor(),
				score: action.score,
				win: !hasAnyBubble,
				gameOver: checkLoseCondition(action.grid),
			}
		}
		case 'RESET':
			return initialState()
		default:
			return state
	}
}

function checkLoseCondition(grid: Cell[][]): boolean {
	return grid[ROWS - 1].some((cell) => cell !== null)
}

// ---------------------------------------------------------------------------
// Helpers for snapping a landing bubble to a free cell
// ---------------------------------------------------------------------------

function findFreeAdjacentCell(
	grid: Cell[][],
	px: number,
	py: number,
	hitCol: number,
	hitRow: number
): { col: number; row: number } | null {
	if (grid[hitRow]?.[hitCol] === null) return { col: hitCol, row: hitRow }

	const neighbours = getNeighbours(hitCol, hitRow)
	let best: { col: number; row: number } | null = null
	let bestDist = Infinity

	for (const n of neighbours) {
		if (grid[n.row]?.[n.col] !== null) continue
		const center = cellToPixel(n.col, n.row)
		const d = Math.hypot(px - center.x, py - center.y)
		if (d < bestDist) {
			bestDist = d
			best = n
		}
	}
	return best
}

function findFreeCell(
	grid: Cell[][],
	col: number,
	row: number
): { col: number; row: number } | null {
	for (let dr = -1; dr <= 1; dr++) {
		for (let dc = -1; dc <= 1; dc++) {
			if (dr === 0 && dc === 0) continue
			const r = row + dr
			const c = col + dc
			if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === null) {
				return { row: r, col: c }
			}
		}
	}
	return null
}

// ---------------------------------------------------------------------------
// Aim-line helper: returns SVG polyline points string
// ---------------------------------------------------------------------------

function buildAimPoints(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	width: number
): string {
	const dx = toX - fromX
	const dy = toY - fromY
	const dist = Math.hypot(dx, dy)
	if (dist === 0) return ''
	const nx = dx / dist
	const ny = dy / dist

	const maxLen = 600
	let len = 0
	let curX = fromX
	let curY = fromY
	let curNx = nx
	const pts: string[] = [fromX + ',' + fromY]

	while (len < maxLen) {
		const stepLen = Math.min(maxLen - len, 20)
		const nextX = curX + curNx * stepLen
		const nextY = curY + ny * stepLen

		if (nextX - BUBBLE_RADIUS < 0) {
			curX = BUBBLE_RADIUS
			curY += ny * stepLen
			curNx = Math.abs(curNx)
		} else if (nextX + BUBBLE_RADIUS > width) {
			curX = width - BUBBLE_RADIUS
			curY += ny * stepLen
			curNx = -Math.abs(curNx)
		} else {
			curX = nextX
			curY = nextY
		}

		pts.push(curX + ',' + curY)
		len += stepLen
	}

	return pts.join(' ')
}

// ---------------------------------------------------------------------------
// SVG bubble helper
// ---------------------------------------------------------------------------

function BubbleSvg({
	x,
	y,
	color,
	radius = BUBBLE_RADIUS,
}: {
	x: number
	y: number
	color: string
	radius?: number
}) {
	return (
		<g>
			<circle cx={x} cy={y} r={radius} fill={color} />
			<circle
				cx={x - radius * 0.3}
				cy={y - radius * 0.3}
				r={radius * 0.3}
				fill="rgba(255,255,255,0.35)"
			/>
			<circle
				cx={x}
				cy={y}
				r={radius}
				fill="none"
				stroke="rgba(255,255,255,0.2)"
				strokeWidth={1.5}
			/>
		</g>
	)
}

// ---------------------------------------------------------------------------
// The game component rendered inside the tldraw shape
// ---------------------------------------------------------------------------

function SnoodGame() {
	const editor = useEditor()
	const [state, dispatch] = useReducer(reducer, undefined, initialState)
	const stateRef = useRef(state)
	stateRef.current = state

	const projectileRef = useRef<Projectile | null>(null)
	const aimRef = useRef<{ x: number; y: number } | null>(null)
	const rafRef = useRef<number | null>(null)

	// Force React re-render each animation frame so the SVG stays animated
	const [, forceUpdate] = useReducer((n: number) => n + 1, 0)

	// -------------------------------------------------------------------------
	// RAF animation loop
	// -------------------------------------------------------------------------
	const renderFrame = useCallback(() => {
		const proj = projectileRef.current
		if (proj) {
			const next = stepProjectile(proj, CANVAS_W)
			projectileRef.current = next

			// Flew off the top
			if (next.y < -BUBBLE_RADIUS) {
				projectileRef.current = null
				const col = Math.max(
					0,
					Math.min(COLS - 1, Math.round((next.x - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 2)))
				)
				handleLand(0, col)
				return
			}

			// Collision with grid
			const hit = checkCollision(next, stateRef.current.grid, (col, row) =>
				cellToPixel(col, row)
			)
			if (hit) {
				const snap = findFreeAdjacentCell(
					stateRef.current.grid,
					next.x,
					next.y,
					hit.col,
					hit.row
				)
				projectileRef.current = null
				if (snap) handleLand(snap.row, snap.col)
				return
			}
		}

		forceUpdate()
		rafRef.current = requestAnimationFrame(renderFrame)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		rafRef.current = requestAnimationFrame(renderFrame)
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [renderFrame])

	// -------------------------------------------------------------------------
	// Bubble landing logic
	// -------------------------------------------------------------------------
	function handleLand(row: number, col: number) {
		const { grid, currentColor, score } = stateRef.current
		const r = Math.max(0, Math.min(ROWS - 1, row))
		const c = Math.max(0, Math.min(COLS - 1, col))

		if (grid[r][c] !== null) {
			const free = findFreeCell(grid, c, r)
			if (!free) {
				dispatch({ type: 'FIRE_RESULT', grid, score })
				rafRef.current = requestAnimationFrame(renderFrame)
				return
			}
			handleLand(free.row, free.col)
			return
		}

		let newGrid = placeBubble(grid, c, r, currentColor)
		const cluster = findCluster(newGrid, c, r)
		let newScore = score

		if (cluster.length >= 3) {
			newGrid = popCluster(newGrid, cluster)
			newScore += cluster.length * 10 * stateRef.current.level
		}

		dispatch({ type: 'FIRE_RESULT', grid: newGrid, score: newScore })
		rafRef.current = requestAnimationFrame(renderFrame)
	}

	// -------------------------------------------------------------------------
	// Pointer event handlers
	// Stop propagation so tldraw default pan/select tools don't interfere.
	// -------------------------------------------------------------------------
	function getLocalPos(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } {
		const rect = e.currentTarget.getBoundingClientRect()
		const zoom = editor.getZoomLevel()
		return {
			x: (e.clientX - rect.left) / zoom,
			y: (e.clientY - rect.top) / zoom,
		}
	}

	function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
		e.stopPropagation()
		if (state.gameOver || state.win) return
		aimRef.current = getLocalPos(e)
		forceUpdate()
	}

	function handlePointerLeave(e: React.PointerEvent<SVGSVGElement>) {
		e.stopPropagation()
		aimRef.current = null
		forceUpdate()
	}

	function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
		e.stopPropagation()
		e.preventDefault()
		if (state.gameOver || state.win) return
		if (projectileRef.current) return

		const { x, y } = getLocalPos(e)
		const vel = computeVelocity(LAUNCHER_X, LAUNCHER_Y, x, y)
		if (vel.vy > 0) return // prevent firing downward

		projectileRef.current = {
			x: LAUNCHER_X,
			y: LAUNCHER_Y,
			...vel,
			color: stateRef.current.currentColor,
		}
	}

	// -------------------------------------------------------------------------
	// Render - SVG only, no canvas
	// -------------------------------------------------------------------------
	const { grid, currentColor, nextColor, score, level, gameOver, win } = state
	const proj = projectileRef.current
	const aim = aimRef.current
	const dangerY = CANVAS_H - 80

	return (
		<HTMLContainer
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				background: '#0f0f1a',
				color: '#fff',
				fontFamily: 'monospace',
				userSelect: 'none',
				overflow: 'hidden',
				width: SHAPE_W,
				height: SHAPE_H,
				borderRadius: 12,
				padding: '12px 16px',
				boxSizing: 'border-box',
			}}
		>
			{/* Score header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					width: '100%',
					marginBottom: 8,
					gap: 12,
				}}
			>
				<span style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2, flex: 1 }}>
					Snood
				</span>
				<span style={{ fontSize: 13, color: '#ccc' }}>
					Score: <strong>{score}</strong>&nbsp; Level: <strong>{level}</strong>
				</span>
			</div>

			{/* Game field - SVG only, no canvas */}
			<div style={{ position: 'relative', display: 'inline-block' }}>
				<svg
					width={CANVAS_W}
					height={CANVAS_H}
					style={{
						background: '#1a1a2e',
						borderRadius: 8,
						border: '2px solid #333',
						display: 'block',
						cursor: gameOver || win ? 'default' : 'crosshair',
					}}
					onPointerMove={handlePointerMove}
					onPointerLeave={handlePointerLeave}
					onPointerDown={handlePointerDown}
				>
					{/* Grid bubbles */}
					{grid.map((row, rowIdx) =>
						row.map((cell, colIdx) => {
							if (!cell) return null
							const { x, y } = cellToPixel(colIdx, rowIdx)
							return <BubbleSvg key={rowIdx + '-' + colIdx} x={x} y={y} color={cell} />
						})
					)}

					{/* Dotted aim line */}
					{!proj && aim && !gameOver && !win && (
						<polyline
							points={buildAimPoints(LAUNCHER_X, LAUNCHER_Y, aim.x, aim.y, CANVAS_W)}
							fill="none"
							stroke="rgba(255,255,255,0.4)"
							strokeWidth={1.5}
							strokeDasharray="6,4"
						/>
					)}

					{/* In-flight projectile */}
					{proj && <BubbleSvg x={proj.x} y={proj.y} color={proj.color} />}

					{/* Launcher bubble */}
					<BubbleSvg x={LAUNCHER_X} y={LAUNCHER_Y} color={currentColor} />

					{/* Next bubble label + preview */}
					<text
						x={LAUNCHER_X + BUBBLE_RADIUS * 2 + 4}
						y={LAUNCHER_Y + 4}
						fill="#fff"
						fontSize={12}
						fontFamily="monospace"
					>
						Next:
					</text>
					<BubbleSvg
						x={LAUNCHER_X + BUBBLE_RADIUS * 4}
						y={LAUNCHER_Y}
						color={nextColor}
						radius={BUBBLE_RADIUS * 0.75}
					/>

					{/* Danger line */}
					<line
						x1={0}
						y1={dangerY}
						x2={CANVAS_W}
						y2={dangerY}
						stroke="rgba(255,60,60,0.5)"
						strokeWidth={1.5}
						strokeDasharray="8,4"
					/>
				</svg>

				{/* Game-over / win overlay */}
				{(gameOver || win) && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: 'rgba(0,0,0,0.75)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: 8,
							zIndex: 10,
						}}
						onPointerDown={(e) => e.stopPropagation()}
					>
						<p style={{ fontSize: 32, marginBottom: 16 }}>
							{win ? 'You Win!' : 'Game Over'}
						</p>
						<button
							style={{
								padding: '10px 24px',
								fontSize: 16,
								background: '#3498db',
								color: '#fff',
								border: 'none',
								borderRadius: 6,
								cursor: 'pointer',
							}}
							onPointerDown={(e) => {
								e.stopPropagation()
								dispatch({ type: 'RESET' })
							}}
						>
							Play Again
						</button>
					</div>
				)}
			</div>

			<p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
				Aim - Click to fire - Match 3+ to pop
			</p>
		</HTMLContainer>
	)
}

// ---------------------------------------------------------------------------
// ShapeUtil
// ---------------------------------------------------------------------------

export class SnoodGameShapeUtil extends BaseBoxShapeUtil<SnoodGameShape> {
	static override type = 'snood-game' as const

	static override props: RecordProps<SnoodGameShape> = {
		w: T.number,
		h: T.number,
	}

	override getDefaultProps(): SnoodGameShape['props'] {
		return { w: SHAPE_W, h: SHAPE_H }
	}

	override canEdit() {
		return false
	}

	override canResize() {
		return false
	}

	override isAspectRatioLocked() {
		return true
	}

	override component(_shape: SnoodGameShape) {
		return <SnoodGame />
	}

	override getIndicatorPath(_shape: SnoodGameShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, SHAPE_W, SHAPE_H)
		return path
	}
}
