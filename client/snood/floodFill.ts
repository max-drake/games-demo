import { Cell, getNeighbours } from './grid'

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
 * Also removes any bubbles no longer connected to the ceiling (row 0).
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

	// Find orphaned bubbles (not connected to ceiling)
	const connected = findConnectedToCeiling(next)
	for (let row = 0; row < next.length; row++) {
		for (let col = 0; col < next[row].length; col++) {
			if (next[row][col] !== null && !connected.has(`${col},${row}`)) {
				next[row][col] = null
			}
		}
	}

	return next
}

/** BFS from all bubbles in row 0; return the set of keys "col,row" that are reachable */
function findConnectedToCeiling(grid: Cell[][]): Set<string> {
	const visited = new Set<string>()
	const queue: Array<{ col: number; row: number }> = []

	// Seed from the top row
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
