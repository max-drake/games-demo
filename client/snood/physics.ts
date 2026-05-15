import { BubbleColor } from './colors'
import { BUBBLE_RADIUS } from './grid'

export interface Projectile {
	x: number
	y: number
	vx: number
	vy: number
	color: BubbleColor
}

/** Speed of the projectile in pixels per frame (at 60 fps) */
export const PROJECTILE_SPEED = 10

/**
 * Compute vx/vy for a projectile fired from (fromX, fromY) toward (targetX, targetY).
 */
export function computeVelocity(
	fromX: number,
	fromY: number,
	targetX: number,
	targetY: number
): { vx: number; vy: number } {
	const dx = targetX - fromX
	const dy = targetY - fromY
	const dist = Math.hypot(dx, dy)
	if (dist === 0) return { vx: 0, vy: -PROJECTILE_SPEED }
	return {
		vx: (dx / dist) * PROJECTILE_SPEED,
		vy: (dy / dist) * PROJECTILE_SPEED,
	}
}

/**
 * Advance the projectile by one frame.
 * Bounces off left/right walls (x between 0+r and canvasWidth-r).
 * Returns the new projectile state.
 */
export function stepProjectile(proj: Projectile, canvasWidth: number): Projectile {
	let { x, y, vx, vy, color } = proj
	x += vx
	y += vy

	// Bounce off left / right walls
	if (x - BUBBLE_RADIUS < 0) {
		x = BUBBLE_RADIUS
		vx = Math.abs(vx)
	} else if (x + BUBBLE_RADIUS > canvasWidth) {
		x = canvasWidth - BUBBLE_RADIUS
		vx = -Math.abs(vx)
	}

	return { x, y, vx, vy, color }
}

/**
 * Check whether a projectile overlaps any occupied grid cell.
 * Returns the hit cell coordinates or null if no collision.
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
