import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Lemmings } from './pages/Lemmings'
import { Room } from './pages/Room'
import { Root } from './pages/Root'
import { Snood } from './pages/Snood'

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
		path: '/:roomId',
		element: <Room />,
	},
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
