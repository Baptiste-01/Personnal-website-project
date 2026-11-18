export type GameStatus = 'available' | 'coming_soon' | 'in_development'

export interface GameInfo {
  id: string
  title: string
  slug: string
  icon: string
  tagline: string
  description: string
  status: GameStatus
  playersRange: string
  roundDuration: string
  difficulty: string
  category: string
  tags: string[]
  highlights: string[]
  actionLabel: string
  route?: string
  accentColor: string
}

export const GAME_CATALOG: GameInfo[] = [
  {
    id: 'flashguess',
    title: 'FlashGuess',
    slug: 'flashguess',
    icon: '⚡',
    tagline: 'Jeu de rapidité et de culture générale en temps réel',
    description:
      'Chaque manche dévoile une question. Tapez la bonne réponse avant vos adversaires pour marquer le maximum de points. Accumulez des séries de flammes et profitez de bonus de vitesse !',
    status: 'available',
    playersRange: '1 - 16 joueurs',
    roundDuration: '10 à 20s par manche',
    difficulty: 'Adaptative (Facile à Difficile)',
    category: 'Culture & Rapidité',
    tags: ['Trivia', 'Speedrun', 'Multijoueur', 'Temps Réel'],
    highlights: [
      'Multi-catégories (Histoire, Géo, Sciences, Cinéma, Warframe...)',
      'Mode Speedrun paramétrable par difficulté',
      'Séries de bonnes réponses avec multiplicateurs x1.5 et x2.0',
      'Détection automatique du 1er joueur à trouver',
    ],
    actionLabel: 'Lancer une arène',
    route: '/',
    accentColor: '#6366f1',
  },
  {
    id: 'bombparty',
    title: 'BombParty (Tic-Tac-Boom)',
    slug: 'bombparty',
    icon: '💣',
    tagline: 'Trouvez un mot contenant la syllabe avant l\'explosion !',
    description:
      'Une bombe avec une mèche allumée passe de joueur en joueur. Trouvez rapidement un mot français valide contenant les lettres affichées pour transmettre la bombe au joueur suivant avant l\'explosion fatale.',
    status: 'coming_soon',
    playersRange: '2 - 16 joueurs',
    roundDuration: 'Temps réel sous pression',
    difficulty: 'Progressif',
    category: 'Vocabulaire & Réflexe',
    tags: ['Mots', 'Dictionnaire', 'Bombe', 'Party Game'],
    highlights: [
      'Dictionnaire de plus de 300 000 mots français officiels',
      'Système de vies limitées avec mort subite finale',
      'Mèche de plus en plus rapide au fil des tours',
      'Gestion des lettres bonus pour recharger ses vies',
    ],
    actionLabel: 'Bientôt disponible',
    accentColor: '#ef4444',
  },
  {
    id: 'blindtest',
    title: 'Blindtest Musical',
    slug: 'blindtest',
    icon: '🎵',
    tagline: 'Reconnaissez l\'artiste ou le titre en quelques secondes',
    description:
      'Écoutez un extrait musical synchronisé et soyez le plus rapide à buzzer ou taper le bon titre ou l\'artiste. Des playlists variées pour tous les goûts musicaux.',
    status: 'coming_soon',
    playersRange: '2 - 20 joueurs',
    roundDuration: '15s d\'écoute par titre',
    difficulty: 'Tous niveaux',
    category: 'Musique & Audio',
    tags: ['Blindtest', 'Musique', 'Buzzer', 'Culture Pop'],
    highlights: [
      'Playlists : Pop, Rock, Rap, Années 80/90/2000, Anime, Jeux Vidéo',
      'Points proportionnels à la rapidité de détection',
      'Indices progressifs (année de sortie, première lettre)',
      'Intégration audio temps réel à faible latence',
    ],
    actionLabel: 'Bientôt disponible',
    accentColor: '#ec4899',
  },
  {
    id: 'quizroyale',
    title: 'Quiz Royale',
    slug: 'quizroyale',
    icon: '👑',
    tagline: 'Battle Royale de questions à élimination directe',
    description:
      'Tous les joueurs répondent en même temps à une succession de questions pièges. Chaque mauvaise réponse vous fait perdre un bouclier. Qui sera le dernier survivant dans l\'arène ?',
    status: 'in_development',
    playersRange: '4 - 50 joueurs',
    roundDuration: 'Survie continue',
    difficulty: 'Difficile',
    category: 'Survie & Battle Royale',
    tags: ['Battle Royale', 'Élimination', 'Compétition', 'Tension'],
    highlights: [
      'Jusqu\'à 50 joueurs simultanés dans une même partie',
      'Questions piégées à choix multiples et saisie libre',
      'Système de zone rétrécie et bonus de survie',
      'Podium et classement de fin de saison',
    ],
    actionLabel: 'En développement',
    accentColor: '#f59e0b',
  },
  {
    id: 'duocoop',
    title: 'Duo Enigmes Co-op',
    slug: 'duocoop',
    icon: '🤝',
    tagline: 'Coopérez à deux pour déchiffrer les indices croisés',
    description:
      'Formez des équipes de deux. Chaque coéquipier reçoit des indices complémentaires et uniques. Vous devez échanger et déduire la réponse secrète sans laisser vos adversaires intercepter la solution.',
    status: 'in_development',
    playersRange: '4 à 12 joueurs (équipes de 2)',
    roundDuration: '30s par énigme',
    difficulty: 'Moyen / Stratégique',
    category: 'Coopération & Équipe',
    tags: ['Coopération', 'Énigmes', 'Équipes', 'Communication'],
    highlights: [
      'Indices croisés asymétriques pour chaque joueur',
      'Canal vocal et texte privé pour chaque duo',
      'Mécanique de bluff pour tromper les équipes rivales',
    ],
    actionLabel: 'En développement',
    accentColor: '#10b981',
  },
]
