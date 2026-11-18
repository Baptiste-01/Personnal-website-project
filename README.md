# 🎮 Smik Party — Real-Time Multiplayer Gaming Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20%7C%20All%20Rights%20Reserved-red?style=for-the-badge)

<p align="center">
  <b>A high-speed, competitive multiplayer trivia & mini-game platform featuring real-time WebSockets, dynamic arena lobbies, custom audio soundscapes, and comprehensive administration tools.</b>
</p>

</div>

---

> [!IMPORTANT]
> ### 🛡️ Intellectual Property & Portfolio Notice
> This repository is maintained as a **personal portfolio showcase** demonstrating software engineering, real-time networking, and full-stack development skills.
> 
> **All Rights Reserved.** No license is granted to clone, run, fork, redistribute, host, or commercially exploit this project or its assets. See [LICENSE](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/LICENSE) for complete legal terms. Production database secrets, API keys, and proprietary trivia question banks are deliberately excluded.

---

## 🌟 Highlights & Features

### ⚡ 1. Real-Time Multiplayer Arenas (WebSockets)
* **Instant synchronization** : Real-time scoreboards, live player presence, and dynamic round timers with zero perceived latency.
* **Configurable Lobbies** : Custom player limits, difficulty tier filtering (*Facile*, *Normal*, *Difficile*), tag filters (`#Anime`, `#Histoire`, `#Sport`), and speed presets.
* **In-Game Live Arena Chat** : Synchronized room messaging across players during lobby and gameplay rounds with auto-scroll and sanitization.

### 🕹️ 2. Dynamic Game Modes
* **FlashGuess Classic** : Multi-round rapid trivia with progressive score decay and answer validation.
* **Speedrun Mode** : Intense individual speed sprints against the clock with custom difficulty filters.
* **Streaks & Podium** : In-game answer streaks indicator, "First to answer" recognition counters, and end-game performance metrics (accuracy %, reaction times, final podium).
* **Multi-Game Hub** : Architecture built to seamlessly plug in new game types from a centralized catalog (`/games`).

### 🎵 3. Immersive Audio Design & Theming
* **Synthesized Web Audio Engine** : Zero external audio dependencies with real-time sound frequency generation.
* **Selectable Soundscapes** : *Néo-Arcade*, *Cyberpunk*, *Minimaliste*, *8-Bit Rétro*.
* **Global Mute & Audio Controls** : Instant mute toggles with persistent `localStorage` states.

### 🛡️ 4. Advanced Admin & Moderation Hub
* **Two-Panel Administration** : Dedicated navigation between Question Bank and User Management.
* **Suspended Questions Review** : Live in-game muting (`🔇 Mettre en sourdine`) by administrators sends disputed questions into a dedicated quarantine space (`/admin?tab=suspended`) with live indicator badges, correction modal, and reactivation workflows.
* **User Lifecycle Management** : Real-time user metrics, search filters, role elevation (`ADMIN` / `USER`), stat resets, and secured account deletion modals.
* **Bulk Import/Export** : Bi-directional support for Excel (`.xlsx`), CSV, and Markdown (`.md`) question banks.

---

## 🏗️ System Architecture

The project is structured as a **strictly typed monorepo** using Bun:

```text
├── apps/
│   ├── web/                     # React 18 + Vite (TailwindCSS, Custom Hooks, Modern Sidebar Layout)
│   └── api/                     # High-performance Bun HTTP & WebSocket server (Controllers > Services > Prisma)
├── packages/
│   ├── database/                # PostgreSQL schema & Prisma ORM definitions
│   └── shared/                  # Shared TypeScript interfaces & business constants
├── documentation/
│   ├── fr/                      # Task-by-task architectural documentation (French)
│   └── en/                      # Task-by-task architectural documentation (English)
├── LICENSE                      # Proprietary All-Rights-Reserved license
└── README.md
```

### 💎 Engineering Standards
* **Strict Type Safety** : Zero tolerance for `any`, `unknown`, or `undefined`.
* **Clean Separation** : Controllers deal with transport, Services encapsulate game mechanics, and Prisma manages PostgreSQL data access.
* **Responsive Layout** : Desktop sidebar with collapsible states, synchronized mobile topbar with non-overlapping overlays.

---

## 📸 Visual Showcase

*(Screenshots and architecture blueprints available in the [documentation](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/fr/README.md) and media artifacts).*

---

## 🔒 Security & Data Privacy

* Production database credentials and environment files (`.env`) are strictly non-committed.
* The comprehensive proprietary trivia question collection is maintained in a private repository to protect game content integrity.

---

## 👤 Author & Contact

**Baptiste** — Full-Stack Developer & Creator of *Smik Party*  
*For professional inquiries, hiring, or live demo walkthroughs, please connect via GitHub profile.*
