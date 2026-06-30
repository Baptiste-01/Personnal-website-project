import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Lobby from './pages/Lobby/index'
import Arena from './pages/Arena/index'
import FlashGuess from './pages/FlashGuess/index'
import Admin from './pages/Admin/index'
import Login from './pages/Login/index'

import Profile from './pages/Profile/index'

const router = createBrowserRouter([
  { path: '/', element: <Lobby /> },
  { path: '/login', element: <Login /> },
  { path: '/profile', element: <Profile /> },
  { path: '/arena/:arenaId', element: <Arena /> },
  { path: '/play/:arenaId', element: <FlashGuess /> },
  { path: '/admin', element: <Admin /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
