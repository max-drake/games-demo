import { BubbleColor } from './colors'
import { Cell, BUBBLE_RADIUS, COLS, ROWS, cellToPixel } from './grid'
import { Projectile } from './physics'

/** Draw the full game scene onto a canvas 2D context */
export function drawScene(
	ctx: CanvasRenderingContext2D,
	grid: Cell[][],
	projectile: Projectile | null,
	launcherX: number,
	launcherY: number,
	currentColor: BubbleColor,
	nextColor: BubbleColor,
	aimX: number | null,
	aimY: number | null,
	score: number,
	level: number
) {
	const { width, height } = ctx.canvas
	ctx.clearRect(0, 0, width, height)

	// Background
	ctx.fillStyle = '#1a1a2e'
	ctx.fillRect(0, 0, width, height)

	// Grid bubbles
	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			const color = grid[row][col]
			if (color) {
				const { x, y } = cellToPixel(col, row)
				drawBubble(ctx, x, y, BUBBLE_RADIUS, color)
			}
		}
	}

	// Aim line (dotted) — only when there's no active projectile
	if (projectile === null && aimX !== null && aimY !== null) {
		drawAimLine(ctx, launcherX, launcherY, aimX, aimY, width)
	}

	// Active projectile
	if (projectile) {
		drawBubble(ctx, projectile.x, projectile.y, BUBBLE_RADIUS, projectile.color)
	}

	// Launcher
	drawBubble(ctx, launcherX, launcherY, BUBBLE_RADIUS, currentColor)

	// Next bubble preview
	ctx.fillStyle = '#ffffff'
	ctx.font = '12px monospace'
	ctx.fillText('Next:', launcherX + BUBBLE_RADIUS * 2 + 4, launcherY + 4)
	drawBubble(ctx, launcherX + BUBBLE_RADIUS * 4, launcherY, BUBBLE_RADIUS * 0.75, nextColor)

	// HUD
	ctx.fillStyle = '#ffffff'
	ctx.font = 'bold 14px monospace'
	ctx.fillText(`Score: ${score}`, 8, 18)
	ctx.fillText(`Level: ${level}`, 8, 36)

	// Danger line near bottom of grid area
	const dangerY = height - 80
	ctx.setLineDash([8, 4])
	ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)'
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(0, dangerY)
	ctx.lineTo(width, dangerY)
	ctx.stroke()
	ctx.setLineDash([])
}

function drawBubble(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: string
) {
	// Main bubble
	ctx.beginPath()
	ctx.arc(x, y, radius, 0, Math.PI * 2)
	ctx.fillStyle = color
	ctx.fill()
	// Shiny highlight
	ctx.beginPath()
	ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2)
	ctx.fillStyle = 'rgba(255,255,255,0.35)'
	ctx.fill()
	// Border
	ctx.beginPath()
	ctx.arc(x, y, radius, 0, Math.PI * 2)
	ctx.strokeStyle = 'rgba(255,255,255,0.2)'
	ctx.lineWidth = 1.5
	ctx.stroke()
}

function drawAimLine(
	ctx: CanvasRenderingContext2D,
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	canvasWidth: number
) {
	const dx = toX - fromX
	const dy = toY - fromY
	const dist = Math.hypot(dx, dy)
	if (dist === 0) return
	const nx = dx / dist
	const ny = dy / dist

	ctx.setLineDash([6, 4])
	ctx.strokeStyle = 'rgba(255,255,255,0.4)'
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(fromX, fromY)

	let curX = fromX
	let curY = fromY
	let curNx = nx
	const curNy = ny
	const maxLen = 600
	let len = 0

	while (len < maxLen) {
		const stepLen = Math.min(maxLen - len, 20)
		const nextX = curX + curNx * stepLen
		const nextY = curY + curNy * stepLen

		if (nextX - BUBBLE_RADIUS < 0) {
			curX = BUBBLE_RADIUS
			curY += curNy * stepLen
			curNx = Math.abs(curNx)
		} else if (nextX + BUBBLE_RADIUS > canvasWidth) {
			curX = canvasWidth - BUBBLE_RADIUS
			curY += curNy * stepLen
			curNx = -Math.abs(curNx)
		} else {
			curX = nextX
			curY = nextY
		}

		ctx.lineTo(curX, curY)
		len += stepLen
	}

	ctx.stroke()
	ctx.setLineDash([])
}
