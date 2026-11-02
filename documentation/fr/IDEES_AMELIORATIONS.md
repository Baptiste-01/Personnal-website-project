# 🚀 Feuille de Route & Idées d'Amélioration - JKLM Clone (Smik Party)

Ce document répertorie les pistes d'évolution stratégiques, techniques, ludiques et ergonomiques pour propulser le projet vers une version de production hautement engageante.

---

## 1. ⚡ Architecture Temps Réel & Multijoueur Réel (Priorité Haute)

* **Remplacement des mocks par des WebSockets natifs :**
  - Connecter l'arène (`apps/web/src/pages/Arena`) et `FlashGuess` au serveur WebSocket Elysia (`@elysiajs/websocket`).
  - Gérer les événements en temps réel : `player_joined`, `player_left`, `player_ready`, `round_started`, `answer_submitted`, `round_ended`, `game_over`.
* **Synchronisation stricte de l'horloge & Anti-triche :**
  - Validation du chronomètre et des réponses exclusivement côté serveur pour éviter les manipulations client.
  - Gestion de la reconnexion automatique en cas de micro-coupure réseau sans perte des scores.
* **Salons personnalisés & Liens d'invitation :**
  - Bouton de copie d'URL d'invitation directe (ex: `https://site.com/arena/room-xyz?token=123`).
  - Option de salon privé protégé par mot de passe ou code PIN à 4 chiffres.

---

## 2. 🎮 Nouveaux Modes de Jeu

* **Mode BombParty (Le classique JKLM) :**
  - Une bombe tourne entre les joueurs avec un compte à rebours décroissant.
  - Une syllabe aléatoire (ex: "PRO", "ANT", "ION") est imposée : le joueur actif doit saisir un mot français valide contenant cette suite de lettres.
  - Intégration d'un dictionnaire français optimisé (arbre préfixe / Trie) chargé en mémoire dans Bun pour une validation en sub-milliseconde.
* **Mode Blind Test Audio / Extrait Express :**
  - Prise en charge des fichiers audio (`.mp3` / streaming) avec extrait de 5 à 15 secondes.
  - Catégories dédiées : génériques de séries/dessins animés, musiques de jeux vidéo, répliques cultes de cinéma.
* **Mode Survie / Battle Royale :**
  - Tous les joueurs répondent en même temps à chaque manche.
  - Les joueurs ayant donné une mauvaise réponse ou les $X$ derniers perdent une vie jusqu'à ce qu'il ne reste qu'un survivant.

---

## 3. 🏆 Gamification, Compétition & Social

* **Classement ELO & Matchmaking Classé (Ranked) :**
  - Calcul dynamique de points ELO après chaque partie multijoueur.
  - Tableau des scores global et saisonnier (Top 50 des meilleurs joueurs par catégorie).
* **Progression du Profil & Récompenses :**
  - Gain de points d'expérience (XP) à chaque bonne réponse et manche gagnée.
  - Titres honorifiques à débloquer (ex: *"Encyclopédie Vivante"*, *"Flash du Clavier"*, *"Maître Géographe"*).
  - Personnalisation de l'avatar et badges de prestige visibles dans le lobby et l'arène.
* **Chat interactif & Émojis animés :**
  - Roue d'émojis expressifs et réactions en direct dans l'arène (ex: rire, sueur froide, applaudissement).

---

## 4. 🎨 Expérience Utilisateur (UX) & Design Sonore

* **Moteur Audio Web (SFX & Ambiance) :**
  - Intégration d'effets sonores immersifs via la Web Audio API : tic-tac de minuteur accéléré dans les 5 dernières secondes, son de validation victorieux, gong d'erreur, fanfare de fin de partie.
  - Contrôle global du volume et interrupteur sourdine rapide (Mute) accessible partout.
* **Podium & Célébration de Fin de Partie :**
  - Écran de fin festif avec podium des 3 premiers, explosion de confettis (`canvas-confetti`) et récapitulatif des temps de réaction moyens.
* **Thèmes graphiques personnalisables :**
  - Thème Néo-Rétro Arcade (actuel), Dark Mode Minimaliste, Thème Cyberpunk fluo.

---

## 5. 🛠 Contenu & Édition Communautaire

* **Créateur de Decks de Questions par les Joueurs :**
  - Interface permettant à tout utilisateur de composer ses propres listes de questions thématiques et de les exporter/partager via un code unique.
* **Système de Feedback sur les Questions :**
  - Bouton vote rapide (Pouce haut / Pouce bas / Signaler une erreur) après chaque question pour détecter automatiquement les coquilles ou les ambiguïtés dans les réponses acceptées.

