# 🎮 Smik Party — Public Portfolio Showcase Template

> [!NOTE]
> Ce fichier sert de modèle prêt à l'emploi si vous décidez de créer un dépôt GitHub public distinct (ex: `smik-party-showcase`) tout en gardant votre dépôt principal (`Personnal-website-project`) **strictement privé**.

---

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
  <b>A competitive real-time trivia & party game web platform featuring synchronized WebSockets, modular game engines, and full-stack administration tools.</b>
</p>

[🔗 Live Demo (Demander l'accès)]() • [📹 Vidéo Démo / Showcase]() • [💼 Profil GitHub](https://github.com/)

</div>

---

## 📌 Présentation du Projet

**Smik Party** est une plateforme web interactive de jeux multijoueurs en temps réel. Conçue avec une exigence stricte de typage, de modularité et de performances sans latence, l'application propose plusieurs modes de jeu compétitifs (FlashGuess, Speedrun) avec salon de discussion en direct, synthèse audio procédurale et espace d'administration complet.

### 🌟 Fonctionnalités Clés
- **Arènes Multijoueurs en Temps Réel** : Lobbies configurables (difficultés, catégories, filtres de tags, limites de joueurs) et synchronisation instantanée via WebSockets.
- **Chat de Salle Intégré** : Échanges en direct entre joueurs dans le salon d'attente et durant les manches de jeu.
- **Moteur Sonore Procédural Web Audio** : 4 thèmes sonores dynamiques synthétisés côté client sans fichiers audio externes lourds.
- **Statistiques & Compétition** : Séries de bonnes réponses (*streaks*), indicateur du premier joueur à répondre, podiums et récapitulatif détaillé en fin de partie.
- **Espace Administration Avancé** : Modération et quarantaine des questions signalées, gestion des utilisateurs (rôles, réinitialisations, suppressions sécurisées), import/export Excel/CSV/Markdown.

---

## 🏛️ Architecture Technique

```text
├── apps/
│   ├── web/                     # Client React 18, Vite, TailwindCSS & composant Sidebar moderne
│   └── api/                     # Serveur HTTP/WebSocket Bun (Clean Architecture 3 tiers)
├── packages/
│   ├── database/                # Schémas PostgreSQL & Prisma ORM
│   └── shared/                  # Typage TypeScript partagé (Zero any / unknown / undefined)
```

---

## 🔒 Propriété Intellectuelle & Confidentialité

Le code source complet ainsi que la banque de questions exclusive sont hébergés sur un **dépôt privé** pour protéger la propriété intellectuelle du créateur.

Ce dépôt vitrine a pour but exclusif de présenter l'architecture, la méthodologie de développement et les choix technologiques à des recruteurs et pairs.

**Tous droits réservés © 2026 Baptiste.**
