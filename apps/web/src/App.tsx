import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Lobby from './pages/Lobby/index'
import Arena from './pages/Arena/index'
import FlashGuess from './pages/FlashGuess/index'
import Admin from './pages/Admin/index'
import AdminUsers from './pages/Admin/AdminUsers'
import Login from './pages/Login/index'
import Profile from './pages/Profile/index'
import GamesHub from './pages/GamesHub/index'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Lobby /> },
      { path: 'games', element: <GamesHub /> },
      { path: 'questions', element: <Admin /> },
      { path: 'admin', element: <Admin /> },
      { path: 'admin/users', element: <AdminUsers /> },
      { path: 'profile', element: <Profile /> },
      { path: 'login', element: <Login /> },
    ],
  },
  { path: '/arena/:arenaId', element: <Arena /> },
  { path: '/play/:arenaId', element: <FlashGuess /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
