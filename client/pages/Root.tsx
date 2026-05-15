import { Link } from 'react-router-dom'
import { uniqueId } from 'tldraw'
import { getLocalStorageItem, setLocalStorageItem } from '../localStorage'

const myLocalRoomId = getLocalStorageItem('my-local-room-id') ?? 'test-room-' + uniqueId()
setLocalStorageItem('my-local-room-id', myLocalRoomId)

export function Root() {
	return (
		<div
			style={{
				minHeight: '100vh',
				background: '#0f0f1a',
				color: '#ffffff',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '24px',
				fontFamily: 'monospace',
			}}
		>
			<h1 style={{ fontSize: '32px', letterSpacing: '4px', margin: 0 }}>🎮 Games Demo</h1>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '240px' }}>
				<Link
					to="/snood"
					style={{
						display: 'block',
						padding: '14px 24px',
						background: '#3498db',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: '8px',
						textAlign: 'center',
						fontSize: '18px',
						fontWeight: 'bold',
						letterSpacing: '1px',
					}}
				>
					🔵 Snood
				</Link>

				<Link
					to="/lemmings"
					style={{
						display: 'block',
						padding: '14px 24px',
						background: '#27ae60',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: '8px',
						textAlign: 'center',
						fontSize: '18px',
						fontWeight: 'bold',
						letterSpacing: '1px',
					}}
				>
					🐾 Lemmings
				</Link>

				<Link
					to="/space-invaders"
					style={{
						display: 'block',
						padding: '14px 24px',
						background: '#8e44ad',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: '8px',
						textAlign: 'center',
						fontSize: '18px',
						fontWeight: 'bold',
						letterSpacing: '1px',
					}}
				>
					👾 Space Invaders
				</Link>

				<Link
					to="/mario"
					style={{
						display: 'block',
						padding: '14px 24px',
						background: '#e80000',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: '8px',
						textAlign: 'center',
						fontSize: '18px',
						fontWeight: 'bold',
						letterSpacing: '1px',
					}}
				>
					🍄 Super Mario World
				</Link>

				<Link
					to={`/${myLocalRoomId}`}
					style={{
						display: 'block',
						padding: '14px 24px',
						background: '#2c2c3e',
						color: '#ccc',
						textDecoration: 'none',
						borderRadius: '8px',
						textAlign: 'center',
						fontSize: '16px',
						border: '1px solid #444',
					}}
				>
					✏️ Drawing Room
				</Link>
			</div>
		</div>
	)
}
