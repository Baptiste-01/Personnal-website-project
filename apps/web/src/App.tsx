import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Lobby from './pages/Lobby/index'
import Arena from './pages/Arena/index'
import FlashGuess from './pages/FlashGuess/index'

const router = createBrowserRouter([
  { path: '/', element: <Lobby /> },
  { path: '/arena/:arenaId', element: <Arena /> },
  { path: '/play/:arenaId', element: <FlashGuess /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
