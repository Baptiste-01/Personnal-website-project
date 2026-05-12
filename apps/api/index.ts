import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

/* ─── In-memory data (until DB is connected) ─── */
const arenas = [
  { id: '1', name: 'Arene Principale', players: 0, maxPlayers: 20, status: 'waiting', gameMode: 'flashguess', difficulty: 'facile', categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'] },
  { id: '2', name: 'Defi Expert', players: 0, maxPlayers: 10, status: 'waiting', gameMode: 'flashguess', difficulty: 'difficile', categories: ['histoire', 'litterature', 'sciences'] },
]

const questions = [
  { id: 1, text: "Quelle est la capitale de la France ?", answer: "Paris", acceptedAnswers: ["paris"], hint: "Ville lumiere", category: "geographie", difficulty: "facile" },
  { id: 2, text: "Quel est le plus grand ocean du monde ?", answer: "Pacifique", acceptedAnswers: ["pacifique", "ocean pacifique"], hint: "Entre l'Asie et l'Amerique", category: "geographie", difficulty: "facile" },
  { id: 3, text: "Quel pays a pour capitale Tokyo ?", answer: "Japon", acceptedAnswers: ["japon", "le japon"], hint: "Pays insulaire", category: "geographie", difficulty: "facile" },
  { id: 4, text: "Quelle est la capitale de l'Australie ?", answer: "Canberra", acceptedAnswers: ["canberra"], hint: "Ce n'est pas Sydney", category: "geographie", difficulty: "moyen" },
  { id: 5, text: "Quelle est la capitale de la Mongolie ?", answer: "Oulan-Bator", acceptedAnswers: ["oulan-bator", "oulan bator", "ulaanbaatar"], hint: "Entre Russie et Chine", category: "geographie", difficulty: "difficile" },
  { id: 6, text: "En quelle annee a debute la Revolution francaise ?", answer: "1789", acceptedAnswers: ["1789"], hint: "Prise de la Bastille", category: "histoire", difficulty: "facile" },
  { id: 7, text: "Qui a decouvert l'Amerique en 1492 ?", answer: "Christophe Colomb", acceptedAnswers: ["christophe colomb", "colomb"], hint: "Navigateur genois", category: "histoire", difficulty: "facile" },
  { id: 8, text: "En quelle annee le mur de Berlin est-il tombe ?", answer: "1989", acceptedAnswers: ["1989"], hint: "Fin de la guerre froide", category: "histoire", difficulty: "moyen" },
  { id: 9, text: "Quel traite a mis fin a la Premiere Guerre mondiale ?", answer: "Traite de Versailles", acceptedAnswers: ["traite de versailles", "versailles"], hint: "1919", category: "histoire", difficulty: "difficile" },
  { id: 10, text: "Quel est le symbole chimique de l'eau ?", answer: "H2O", acceptedAnswers: ["h2o"], hint: "Deux elements", category: "sciences", difficulty: "facile" },
  { id: 11, text: "Quelle planete est surnommee la planete rouge ?", answer: "Mars", acceptedAnswers: ["mars"], hint: "4e planete", category: "sciences", difficulty: "facile" },
  { id: 12, text: "Qui a formule la theorie de la relativite ?", answer: "Einstein", acceptedAnswers: ["einstein", "albert einstein"], hint: "E=mc2", category: "sciences", difficulty: "moyen" },
  { id: 13, text: "Quel personnage dit 'Je suis ton pere' ?", answer: "Dark Vador", acceptedAnswers: ["dark vador", "darth vader"], hint: "Star Wars", category: "cinema", difficulty: "facile" },
  { id: 14, text: "Quel acteur incarne Jack Sparrow ?", answer: "Johnny Depp", acceptedAnswers: ["johnny depp", "depp"], hint: "Pirates des Caraibes", category: "cinema", difficulty: "facile" },
  { id: 15, text: "Quel realisateur a cree Inception ?", answer: "Christopher Nolan", acceptedAnswers: ["christopher nolan", "nolan"], hint: "Britannique", category: "cinema", difficulty: "moyen" },
  { id: 16, text: "Quel groupe a chante Bohemian Rhapsody ?", answer: "Queen", acceptedAnswers: ["queen"], hint: "Freddie Mercury", category: "musique", difficulty: "facile" },
  { id: 17, text: "Quel instrument a 88 touches ?", answer: "Piano", acceptedAnswers: ["piano", "le piano"], hint: "Touches noires et blanches", category: "musique", difficulty: "facile" },
  { id: 18, text: "Combien de joueurs dans une equipe de football ?", answer: "11", acceptedAnswers: ["11", "onze"], hint: "Sur le terrain", category: "sport", difficulty: "facile" },
  { id: 19, text: "Qui a ecrit Les Miserables ?", answer: "Victor Hugo", acceptedAnswers: ["victor hugo", "hugo"], hint: "XIXe siecle", category: "litterature", difficulty: "facile" },
  { id: 20, text: "De quel pays vient la pizza ?", answer: "Italie", acceptedAnswers: ["italie", "l'italie"], hint: "Botte", category: "gastronomie", difficulty: "facile" },
  { id: 21, text: "Quel est l'ingredient principal du guacamole ?", answer: "Avocat", acceptedAnswers: ["avocat", "l'avocat"], hint: "Fruit vert", category: "gastronomie", difficulty: "moyen" },
  { id: 22, text: "Quel pays a remporte la Coupe du monde 2018 ?", answer: "France", acceptedAnswers: ["france", "la france"], hint: "Equipe de Deschamps", category: "sport", difficulty: "facile" },
  { id: 23, text: "De quel pays vient le sushi ?", answer: "Japon", acceptedAnswers: ["japon", "le japon"], hint: "Riz et poisson cru", category: "gastronomie", difficulty: "facile" },
  { id: 24, text: "Qui a peint le plafond de la chapelle Sixtine ?", answer: "Michel-Ange", acceptedAnswers: ["michel-ange", "michel ange", "michelangelo"], hint: "Renaissance italienne", category: "histoire", difficulty: "moyen" },
  { id: 25, text: "Quel compositeur est devenu sourd ?", answer: "Beethoven", acceptedAnswers: ["beethoven", "ludwig van beethoven"], hint: "Symphonie n5", category: "musique", difficulty: "moyen" },
]

/** Shuffle array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const app = new Elysia()
  .use(cors())
  .get('/', () => ({
    name: 'Smik Party API',
    status: 'online',
    serverTime: new Date().toISOString()
  }))
  // Arenas
  .get('/arenas', () => arenas)
  .get('/arenas/:id', ({ params }) => {
    const arena = arenas.find(a => a.id === params.id)
    if (!arena) return new Response(JSON.stringify({ error: 'Arene introuvable' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    return arena
  })
  // Legacy route
  .get('/rooms', () => arenas)
  .get('/rooms/:id', ({ params }) => {
    const arena = arenas.find(a => a.id === params.id)
    if (!arena) return new Response(JSON.stringify({ error: 'Arene introuvable' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    return arena
  })
  // Questions
  .get('/questions', ({ query }) => {
    const cats = query.categories?.split(',') ?? []
    const diff = query.difficulty ?? 'facile'
    const count = Number(query.count ?? '10')

    let filtered = questions
    if (cats.length > 0) filtered = filtered.filter(q => cats.includes(q.category))
    if (diff) filtered = filtered.filter(q => q.difficulty === diff)

    return shuffle(filtered).slice(0, count)
  })
  .listen(3000)

console.log(`Smik Party API running at ${app.server?.hostname}:${app.server?.port}`)