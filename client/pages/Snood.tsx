/**
 * Snood.tsx
 *
 * Renders the Snood bubble-shooter game on a tldraw canvas.
 * All game graphics use SVG inside a custom tldraw shape — no HTML <canvas>.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Tldraw, createShapeId, useEditor } from 'tldraw'
import { SnoodGameShapeUtil } from '../snood/SnoodShapeUtil'

const shapeUtils = [SnoodGameShapeUtil]

// Stable shape ID so we can check for re-mount without duplicating
const SNOOD_SHAPE_ID = createShapeId('snood-game-singleton')

// ---------------------------------------------------------------------------
// Inner component — runs inside the tldraw editor context
// ---------------------------------------------------------------------------

function SnoodInner() {
	const editor = useEditor()

	useEffect(() => {
		// Only create the shape once; guard against StrictMode double-invoke
		if (editor.getShape(SNOOD_SHAPE_ID)) return

		editor.createShape({
			id: SNOOD_SHAPE_ID,
			type: 'snood-game',
			x: 0,
			y: 0,
		})

		// Zoom to fit the game shape and lock the camera so players can't pan/zoom
		editor.zoomToFit({ animation: { duration: 0 } })
		editor.setCameraOptions({ isLocked: true })
	}, [editor])

	return null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Snood() {
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				display: 'flex',
				flexDirection: 'column',
				background: '#0f0f1a',
			}}
		>
			{/* Thin top bar */}
			<div
				style={{
					height: 40,
					display: 'flex',
					alignItems: 'center',
					padding: '0 16px',
					background: '#0f0f1a',
					borderBottom: '1px solid #222',
					zIndex: 1,
					flexShrink: 0,
				}}
			>
				<Link to="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: 14 }}>
					Back to lobby
				</Link>
			</div>

			{/* tldraw fills the remaining screen */}
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw
					shapeUtils={shapeUtils}
					hideUi={true}
					onMount={(editor) => {
						editor.updateInstanceState({ isDebugMode: false })
					}}
				>
					<SnoodInner />
				</Tldraw>
			</div>
		</div>
	)
}
