import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
    .use(cors())
    .get('/', () => ({
        message: 'Bienvenue sur l\'API JKLM Clone !',
        status: 'online',
        serverTime: new Date().toISOString()
    }))
    .get('/rooms', () => [
        { id: '1', name: 'Explosion de Mots', players: 5, status: 'playing' },
        { id: '2', name: 'Dictionnaire Rapide', players: 2, status: 'waiting' },
        { id: '3', name: 'Soirée Quiz', players: 12, status: 'playing' }
    ])
    .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)