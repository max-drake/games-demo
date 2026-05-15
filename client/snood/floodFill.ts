/**
 * floodFill.ts
 * BFS cluster detection and cluster-pop logic.
 *
 * Orphan-bubble removal (gravity) is delegated to gravity.ts.
 */

import { Cell, getNeighbours } from './grid'
import { dropOrphanBubbles } from './gravity'

/**
 * Find all cells in the connected cluster of the same colour starting at (col, row).
 * Returns an array of { col, row } positions.
 */
export function findCluster(
	grid: Cell[][],
	col: number,
	row: number
): Array<{ col: number; row: number }> {
	const color = grid[row][col]
	if (!color) return []

	const visited = new Set<string>()
	const queue: Array<{ col: number; row: number }> = [{ col, row }]
	const cluster: Array<{ col: number; row: number }> = []

	while (queue.length > 0) {
		const current = queue.shift()!
		const key = `${current.col},${current.row}`
		if (visited.has(key)) continue
		visited.add(key)
		cluster.push(current)

		for (const neighbour of getNeighbours(current.col, current.row)) {
			if (!visited.has(`${neighbour.col},${neighbour.row}`)) {
				if (grid[neighbour.row][neighbour.col] === color) {
					queue.push(neighbour)
				}
			}
		}
	}

	return cluster
}

/**
 * Remove a set of cells from the grid and return the new grid.
 * Also removes any bubbles no longer connected to the ceiling (row 0)
 * by delegating to dropOrphanBubbles() in gravity.ts.
 */
export function popCluster(
	grid: Cell[][],
	cluster: Array<{ col: number; row: number }>
): Cell[][] {
	// Clear the matched cluster
	const next = grid.map((r) => [...r])
	for (const { col, row } of cluster) {
		next[row][col] = null
	}

	// Drop any bubbles that are now floating (not connected to ceiling)
	return dropOrphanBubbles(next)
}
