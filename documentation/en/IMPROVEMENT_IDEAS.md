# 🚀 Roadmap & Improvement Ideas - JKLM Clone (Smik Party)

This document outlines strategic, technical, gameplay, and ergonomic development vectors to elevate the project to an engaging, production-ready multiplayer experience.

---

## 1. ⚡ Real-Time Architecture & Real Multiplayer (High Priority)

* **Replace Mock Data with Native WebSockets:**
  - Connect Arena (`apps/web/src/pages/Arena`) and `FlashGuess` to the Elysia WebSocket server (`@elysiajs/websocket`).
  - Handle real-time network events: `player_joined`, `player_left`, `player_ready`, `round_started`, `answer_submitted`, `round_ended`, `game_over`.
* **Strict Clock Synchronization & Anti-Cheat:**
  - Server-authoritative countdown timing and answer verification to eliminate client-side tampering.
  - Automatic network reconnection handling without score loss.
* **Custom Rooms & Direct Invite Links:**
  - Direct invitation URL copy button (e.g., `https://site.com/arena/room-xyz?token=123`).
  - Private arena support protected by password or 4-digit PIN code.

---

## 2. 🎮 New Game Modes

* **BombParty Mode (The JKLM Classic):**
  - A ticking bomb rotates between players with a decreasing countdown timer.
  - A random syllable is presented (e.g., "PRO", "ANT", "ION"): the active player must submit a valid French word containing this substring.
  - In-memory French dictionary (Trie data structure) loaded in Bun for sub-millisecond lookups.
* **Audio Blind Test / Quick Clip Mode:**
  - Audio file and streaming playback (`.mp3`) with 5 to 15-second sound snippets.
  - Dedicated categories: TV show and cartoon themes, video game soundtracks, iconic movie quotes.
* **Survival / Battle Royale Mode:**
  - All players answer simultaneously each round.
  - Players submitting wrong answers or the slowest $X$ participants lose a life until only one winner remains.

---

## 3. 🏆 Gamification, Competitive Ranking & Social Features

* **ELO Rating & Ranked Matchmaking:**
  - Dynamic ELO rating calculations following each competitive game.
  - Global and seasonal leaderboards (Top 50 rankings per category).
* **Profile Progression & Rewards:**
  - Experience points (XP) awarded for correct answers and round victories.
  - Unlockable prestige titles (e.g., *"Living Encyclopedia"*, *"Keyboard Flash"*, *"Master Geographer"*).
  - Avatar customization and badges visible in the lobby and live arena.
* **Interactive Chat & Animated Reactions:**
  - Expressive emoji wheel and in-game live reactions (e.g., laughter, cold sweat, applause).

---

## 4. 🎨 User Experience (UX) & Sound Design

* **Web Audio Sound Engine (SFX & Ambience):**
  - Procedural sound effects via Web Audio API: accelerated countdown ticking, triumphant chimes, error buzzers, victory fanfares.
  - Global volume slider and persistent quick-mute toggle across all screens.
* **Celebration & Post-Game Podium:**
  - Dynamic 3-tier podium, confetti fireworks (`canvas-confetti`), and reaction speed statistics.
* **Customizable Themes:**
  - Neo-Arcade (default), Minimalist Dark Zinc, Neon Cyberpunk.

---

## 5. 🛠 Community Content & Deck Authoring

* **Player-Created Question Decks:**
  - Interface enabling users to author their own custom quiz packs and share them via unique deck codes.
* **Question Quality Feedback System:**
  - Quick voting buttons (Thumbs up / Thumbs down / Report error) following each question to crowdsource catalog moderation.

