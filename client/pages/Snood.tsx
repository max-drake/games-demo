import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BubbleColor, randomColor } from '../snood/colors'
import { findCluster, popCluster } from '../snood/floodFill'
import {
	Cell,
	BUBBLE_RADIUS,
	COLS,
	ROWS,
	cellToPixel,
	createInitialGrid,
	getNeighbours,
	placeBubble,
} from '../snood/grid'
import { checkCollision } from '../snood/collision'
import { Projectile, computeVelocity, stepProjectile } from '../snood/physics'
import { drawScene } from '../snood/renderer'

// ---------------------------------------------------------------------------
// State & Reducer
// ---------------------------------------------------------------------------

export interface GameState {
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

/** Lose if any bubble has reached the last row */
function checkLoseCondition(grid: Cell[][]): boolean {
	return grid[ROWS - 1].some((cell) => cell !== null)
}

// ---------------------------------------------------------------------------
// Canvas dimensions
// ---------------------------------------------------------------------------
const CANVAS_WIDTH = COLS * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS * 2
const CANVAS_HEIGHT = ROWS * (BUBBLE_RADIUS * 2 - 4) + BUBBLE_RADIUS * 4 + 80

const LAUNCHER_X = CANVAS_WIDTH / 2
const LAUNCHER_Y = CANVAS_HEIGHT - BUBBLE_RADIUS * 2

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Snood() {
	const [state, dispatch] = useReducer(reducer, undefined, initialState)
	const canvasRef = useRef<HTMLCanvasElement>(null)

	// Mutable refs so the RAF loop does not capture stale closures
	const projectileRef = useRef<Projectile | null>(null)
	const aimRef = useRef<{ x: number; y: number } | null>(null)
	const stateRef = useRef(state)
	stateRef.current = state

	const rafRef = useRef<number | null>(null)

	// ---------------------------------------------------------------------------
	// Render loop
	// ---------------------------------------------------------------------------
	const renderFrame = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const { grid, currentColor, nextColor, score, level } = stateRef.current
		const proj = projectileRef.current
		const aim = aimRef.current

		drawScene(
			ctx,
			grid,
			proj,
			LAUNCHER_X,
			LAUNCHER_Y,
			currentColor,
			nextColor,
			aim?.x ?? null,
			aim?.y ?? null,
			score,
			level
		)

		// Advance projectile
		if (proj) {
			const next = stepProjectile(proj, CANVAS_WIDTH)
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
				if (snap) {
					handleLand(snap.row, snap.col)
				}
				return
			}
		}

		rafRef.current = requestAnimationFrame(renderFrame)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		rafRef.current = requestAnimationFrame(renderFrame)
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [renderFrame])

	// ---------------------------------------------------------------------------
	// Game logic on bubble landing
	// ---------------------------------------------------------------------------
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

	// ---------------------------------------------------------------------------
	// Mouse handlers
	// ---------------------------------------------------------------------------
	function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
		const rect = canvasRef.current!.getBoundingClientRect()
		return { x: e.clientX - rect.left, y: e.clientY - rect.top }
	}

	function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
		if (state.gameOver || state.win) return
		aimRef.current = getCanvasPos(e)
	}

	function handleMouseLeave() {
		aimRef.current = null
	}

	function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
		if (state.gameOver || state.win) return
		if (projectileRef.current) return // already in flight

		const { x, y } = getCanvasPos(e)
		const vel = computeVelocity(LAUNCHER_X, LAUNCHER_Y, x, y)
		if (vel.vy > 0) return // prevent firing downwards

		projectileRef.current = {
			x: LAUNCHER_X,
			y: LAUNCHER_Y,
			...vel,
			color: stateRef.current.currentColor,
		}
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------
	return (
		<div style={styles.page}>
			<div style={styles.header}>
				<Link to="/" style={styles.backLink}>
					← Back
				</Link>
				<h1 style={styles.title}>Snood</h1>
				<div style={styles.hud}>
					Score: <strong>{state.score}</strong> &nbsp; Level:{' '}
					<strong>{state.level}</strong>
				</div>
			</div>

			<div style={styles.canvasWrapper}>
				{(state.gameOver || state.win) && (
					<div style={styles.overlay}>
						<p style={styles.overlayText}>
							{state.win ? '🎉 You Win!' : '💀 Game Over'}
						</p>
						<button
							style={styles.restartBtn}
							onClick={() => dispatch({ type: 'RESET' })}
						>
							Play Again
						</button>
					</div>
				)}
				<canvas
					ref={canvasRef}
					width={CANVAS_WIDTH}
					height={CANVAS_HEIGHT}
					style={styles.canvas}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					onClick={handleClick}
				/>
			</div>

			<p style={styles.hint}>Aim with the mouse · Click to fire · Match 3+ to pop</p>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Helpers
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
// Styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
	page: {
		minHeight: '100vh',
		background: '#0f0f1a',
		color: '#ffffff',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: '16px',
		fontFamily: 'monospace',
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		gap: '16px',
		marginBottom: '16px',
		width: '100%',
		maxWidth: `${CANVAS_WIDTH}px`,
	},
	backLink: {
		color: '#aaa',
		textDecoration: 'none',
		fontSize: '14px',
	},
	title: {
		margin: 0,
		fontSize: '24px',
		letterSpacing: '2px',
		flex: 1,
	},
	hud: {
		fontSize: '14px',
		color: '#ccc',
	},
	canvasWrapper: {
		position: 'relative',
		display: 'inline-block',
	},
	canvas: {
		cursor: 'crosshair',
		display: 'block',
		borderRadius: '8px',
		border: '2px solid #333',
	},
	overlay: {
		position: 'absolute',
		inset: 0,
		background: 'rgba(0,0,0,0.75)',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: '8px',
		zIndex: 10,
	},
	overlayText: {
		fontSize: '32px',
		marginBottom: '16px',
	},
	restartBtn: {
		padding: '10px 24px',
		fontSize: '16px',
		background: '#3498db',
		color: '#fff',
		border: 'none',
		borderRadius: '6px',
		cursor: 'pointer',
	},
	hint: {
		marginTop: '12px',
		fontSize: '13px',
		color: '#666',
	},
}
