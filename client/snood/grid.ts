import { BubbleColor, randomColor } from './colors'

// Grid dimensions
export const COLS = 12
export const ROWS = 12
export const BUBBLE_RADIUS = 20

// A grid cell is either empty (null) or a colour
export type Cell = BubbleColor | null

/** Create a grid pre-filled with bubbles in the top N rows */
export function createInitialGrid(filledRows = 5): Cell[][] {
	return Array.from({ length: ROWS }, (_, row) =>
		Array.from({ length: COLS }, () => (row < filledRows ? randomColor() : null))
	)
}

/**
 * Return the pixel centre (x, y) of a grid cell, using a hex-offset layout:
 *   - odd rows are shifted right by half a bubble diameter
 */
export function cellToPixel(
	col: number,
	row: number,
	offsetX = BUBBLE_RADIUS,
	offsetY = BUBBLE_RADIUS
): { x: number; y: number } {
	const diameter = BUBBLE_RADIUS * 2
	const rowOffset = row % 2 === 1 ? BUBBLE_RADIUS : 0
	return {
		x: offsetX + col * diameter + rowOffset,
		y: offsetY + row * (diameter - 4), // slight vertical overlap for hex feel
	}
}

/**
 * Snap a pixel position (x, y) to the nearest grid cell.
 * Returns { col, row } or null if out of bounds.
 */
export function pixelToCell(
	px: number,
	py: number,
	offsetX = BUBBLE_RADIUS,
	offsetY = BUBBLE_RADIUS
): { col: number; row: number } | null {
	const diameter = BUBBLE_RADIUS * 2
	const row = Math.round((py - offsetY) / (diameter - 4))
	const rowOffset = row % 2 === 1 ? BUBBLE_RADIUS : 0
	const col = Math.round((px - offsetX - rowOffset) / diameter)
	if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null
	return { col, row }
}

/** Return the 6 hex-grid neighbours of a cell */
export function getNeighbours(col: number, row: number): Array<{ col: number; row: number }> {
	const isOdd = row % 2 === 1
	return [
		{ col: col - 1, row },
		{ col: col + 1, row },
		{ col: col, row: row - 1 },
		{ col: col, row: row + 1 },
		{ col: col + (isOdd ? 1 : -1), row: row - 1 },
		{ col: col + (isOdd ? 1 : -1), row: row + 1 },
	].filter((n) => n.col >= 0 && n.col < COLS && n.row >= 0 && n.row < ROWS)
}

/** Place a bubble on the grid, returning a new grid (immutable update) */
export function placeBubble(grid: Cell[][], col: number, row: number, color: BubbleColor): Cell[][] {
	const next = grid.map((r) => [...r])
	next[row][col] = color
	return next
}
