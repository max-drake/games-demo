import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Lemmings } from './pages/Lemmings'
import { Mario } from './pages/Mario'
import { Room } from './pages/Room'
import { Root } from './pages/Root'
import { Snood } from './pages/Snood'
import { SpaceInvaders } from './pages/SpaceInvaders'

const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
	},
	{
		path: '/snood',
		element: <Snood />,
	},
	{
		path: '/lemmings',
		element: <Lemmings />,
	},
	{
		path: '/space-invaders',
		element: <SpaceInvaders />,
	},
	{
		path: '/mario',
		element: <Mario />,
	},
	{
		path: '/:roomId',
		element: <Room />,
	},
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
