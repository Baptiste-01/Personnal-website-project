import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  players: number
  status: 'playing' | 'waiting'
}

function App() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:3000/rooms')
      .then(res => res.json())
      .then(data => {
        setRooms(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des salons:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-indigo-500">
      <header className="py-8 md:py-12 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 animate-bounce">
          🎮 JKLM <span className="text-indigo-500">Clone</span>
        </h1>
        <p className="text-neutral-400 text-lg md:text-xl max-w-lg mx-auto">
          Le jeu de mots multijoueur le plus rapide et fun du web.
        </p>
      </header>

      <main className="w-full px-4 md:px-8 lg:px-16 pb-16 md:pb-24">
        <div className="bg-neutral-800 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-neutral-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Salons Actifs</h2>
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-6 py-2 rounded-full font-bold w-full sm:w-auto"
            >
              Actualiser
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  className="group bg-neutral-700/50 hover:bg-neutral-700 p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 transition-all cursor-pointer border border-transparent hover:border-neutral-600"
                >
                  <div className="w-full sm:w-auto">
                    <h3 className="text-lg md:text-xl font-bold group-hover:text-indigo-400 transition-colors">
                      {room.name}
                    </h3>
                    <p className="text-neutral-400 text-sm md:text-base">
                      {room.players} joueurs en ligne
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <span className={`px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-bold ${
                      room.status === 'playing' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {room.status === 'playing' ? 'En cours' : 'En attente'}
                    </span>
                    <button className="bg-white text-black font-bold px-4 md:px-6 py-1.5 md:py-2 rounded-xl hover:bg-indigo-100 transition-colors text-sm md:text-base">
                      Rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <section className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <div className="bg-neutral-800/50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-700 text-center">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">⚡</div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Rapide</h3>
            <p className="text-neutral-400 text-sm md:text-base">Des serveurs ultra-réactifs propulsés par Bun.</p>
          </div>
          <div className="bg-neutral-800/50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-700 text-center">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">🤝</div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Social</h3>
            <p className="text-neutral-400 text-sm md:text-base">Jouez avec vos amis partout dans le monde.</p>
          </div>
          <div className="bg-neutral-800/50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-700 text-center sm:col-span-2 md:col-span-1">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">🏆</div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Compétitif</h3>
            <p className="text-neutral-400 text-sm md:text-base">Montrez que vous êtes le meilleur en français.</p>
          </div>
        </section>
      </main>

      <footer className="py-8 md:py-12 border-t border-neutral-800 text-center text-neutral-500 px-4">
        <p className="text-sm md:text-base">© 2026 JKLM Clone - Créé avec passion</p>
      </footer>
    </div>
  )
}

export default App
