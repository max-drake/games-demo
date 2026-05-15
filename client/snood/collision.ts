/**
 * collision.ts
 * Projectile-vs-bubble and projectile-vs-wall hit detection.
 */

import { BUBBLE_RADIUS } from './grid'
import { Projectile } from './physics'

/**
 * Check whether a projectile overlaps any occupied grid cell.
 * Returns the hit cell coordinates { col, row } or null if no collision.
 *
 * @param proj        The current projectile state.
 * @param grid        2-D grid (null = empty, anything else = occupied bubble).
 * @param getCellCenter  Function that returns the pixel centre of a grid cell.
 */
export function checkCollision(
	proj: Projectile,
	grid: (null | unknown)[][],
	getCellCenter: (col: number, row: number) => { x: number; y: number }
): { col: number; row: number } | null {
	const minDist = BUBBLE_RADIUS * 2

	for (let row = 0; row < grid.length; row++) {
		for (let col = 0; col < grid[row].length; col++) {
			if (grid[row][col] === null) continue
			const center = getCellCenter(col, row)
			const dist = Math.hypot(proj.x - center.x, proj.y - center.y)
			if (dist < minDist) {
				return { col, row }
			}
		}
	}
	return null
}

/**
 * Check whether the projectile has hit the top wall (ceiling).
 * Returns true when the projectile centre is above the canvas top edge.
 */
export function hitsCeiling(proj: Projectile): boolean {
	return proj.y - BUBBLE_RADIUS < 0
}

/**
 * Check whether the projectile has hit the left wall.
 */
export function hitsLeftWall(proj: Projectile): boolean {
	return proj.x - BUBBLE_RADIUS < 0
}

/**
 * Check whether the projectile has hit the right wall.
 */
export function hitsRightWall(proj: Projectile, canvasWidth: number): boolean {
	return proj.x + BUBBLE_RADIUS > canvasWidth
}
