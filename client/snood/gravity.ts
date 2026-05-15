/**
 * gravity.ts
 * Find bubbles that are no longer connected to the ceiling and drop (remove) them.
 *
 * After a cluster is popped, bubbles that were only held up by that cluster
 * become "floating" and should fall off the grid.
 */

import { Cell, getNeighbours } from './grid'

/**
 * Return a new grid with all bubbles that are not reachable from row 0
 * (the ceiling) removed.  Connected-to-ceiling means there is a path of
 * adjacent, non-null bubbles from the bubble up to the top row.
 *
 * @param grid  The grid after a cluster pop.
 * @returns     A new grid with orphaned bubbles set to null.
 */
export function dropOrphanBubbles(grid: Cell[][]): Cell[][] {
	const connected = findConnectedToCeiling(grid)
	const next = grid.map((row) => [...row])

	for (let row = 0; row < next.length; row++) {
		for (let col = 0; col < next[row].length; col++) {
			if (next[row][col] !== null && !connected.has(`${col},${row}`)) {
				next[row][col] = null
			}
		}
	}

	return next
}

/**
 * BFS from all non-null bubbles in row 0 (the ceiling).
 * Returns the set of string keys "col,row" for every reachable bubble.
 */
export function findConnectedToCeiling(grid: Cell[][]): Set<string> {
	const visited = new Set<string>()
	const queue: Array<{ col: number; row: number }> = []

	// Seed from every occupied cell in the top row
	for (let col = 0; col < grid[0].length; col++) {
		if (grid[0][col] !== null) {
			queue.push({ col, row: 0 })
		}
	}

	while (queue.length > 0) {
		const current = queue.shift()!
		const key = `${current.col},${current.row}`
		if (visited.has(key)) continue
		visited.add(key)

		for (const neighbour of getNeighbours(current.col, current.row)) {
			if (!visited.has(`${neighbour.col},${neighbour.row}`)) {
				if (grid[neighbour.row][neighbour.col] !== null) {
					queue.push(neighbour)
				}
			}
		}
	}

	return visited
}
