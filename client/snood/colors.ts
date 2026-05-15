// Snood bubble colour palette

export const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'] as const

export type BubbleColor = (typeof COLORS)[number]

/** Return a random colour from the palette */
export function randomColor(): BubbleColor {
	return COLORS[Math.floor(Math.random() * COLORS.length)]
}
