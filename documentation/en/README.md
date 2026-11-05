# 📚 Project Documentation - JKLM Clone

## 🌟 General Overview
This project is a high-performance, real-time multiplayer word and trivia party game inspired by JKLM, centered on speed, knowledge, and vocabulary (notably featuring the **FlashGuess** game mode).

### 🛠 Tech Stack
- **Runtime & Package Manager:** Bun
- **Frontend:** React 18, Vite, TailwindCSS
- **Backend / API:** Modular Bun HTTP server, Prisma ORM
- **Database:** PostgreSQL containerized via Docker Compose
- **Architecture:** Monorepo organized into `apps/` (`web`, `api`) and `packages/` (`database`, `shared`)

---

## 📑 Tasks & Commits Documentation Index

Each commit/task is documented following a standardized format (`Objective`, `Action Plan`, `Implementation`, `Modified Files`, `Conclusion`):

| # | Date | Commit | Documentation Sheet | Description |
|:---|:---:|:---:|:---|:---|
| **01** | 2026-04-22 | `5cf062a` | [Task_01_2026-04-22.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_01_2026-04-22.md) | Initial commit |
| **02** | 2026-04-24 | `45224b4` | [Task_02_2026-04-24.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_02_2026-04-24.md) | Read me & technical guidelines |
| **03** | 2026-04-24 | `a6b9070` | [Task_03_2026-04-24.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_03_2026-04-24.md) | Prototype & Bun monorepo setup |
| **04** | 2026-04-28 | `d438716` | [Task_04_2026-04-28.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_04_2026-04-28.md) | GitHub issue template |
| **05** | 2026-04-28 | `e8f2be5` | [Task_05_2026-04-28.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_05_2026-04-28.md) | Responsive design improvements |
| **06** | 2026-05-12 | `ea557b0` | [Task_06_2026-05-12.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_06_2026-05-12.md) | Startup guide (STARTUP.md) |
| **07** | 2026-05-12 | `a5a9d45` | [Task_07_2026-05-12.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_07_2026-05-12.md) | FlashGuess v1 game mode |
| **08** | 2026-05-14 | `802c201` | [Task_08_2026-05-14.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_08_2026-05-14.md) | Excel importation & modular API routes |
| **09** | 2026-05-15 | `a56b759` | [Task_09_2026-05-15.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_09_2026-05-15.md) | Bilingual docs & Bun dev scripts |
| **10** | 2026-06-06 | `a7b6f24` | [Task_10_2026-06-06.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_10_2026-06-06.md) | Login page, Slider component & icons |
| **11** | 2026-06-07 | `f7733c4` | [Task_11_2026-06-07.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_11_2026-06-07.md) | Prisma & environment cleanup |
| **12** | 2026-06-07 | `12f4cce` | [Task_12_2026-06-07.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_12_2026-06-07.md) | End-to-end user authentication |
| **13** | 2026-06-30 | `485347e` | [Task_13_2026-06-30.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_13_2026-06-30.md) | Profile page & Arena overhaul |
| **14** | 2026-08-31 | `2333e51` | [Task_14_2026-08-31.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_14_2026-08-31.md) | Lobby & arena creation system |
| **15** | 2026-09-01 | `d5318dc` | [Task_15_2026-09-01.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_15_2026-09-01.md) | Question difficulty system per category |
| **16** | 2026-09-01 | `9878d54` | [Task_16_2026-09-01.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_16_2026-09-01.md) | Question image & media support |
| **17** | 2026-10-29 | `Workspace` | [Task_17_2026-10-29.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_17_2026-10-29.md) | User experience & sound design (Web Audio, Confetti, Themes, Podium) |
| **18** | 2026-11-02 | `Workspace` | [Task_18_2026-11-02.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_18_2026-11-02.md) | Excel Subcategory Tags & Mobile Responsive Arena |
| **19** | 2026-11-02 | `Workspace` | [Task_19_2026-11-02.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_19_2026-11-02.md) | Removal of Fake Accounts & Dynamic Player Limit Management |
| **20** | 2026-11-02 | `Workspace` | [Task_20_2026-11-02.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_20_2026-11-02.md) | Fix Excel Import for Visual Questions & AGENTS.md Rules |
| **21** | 2026-11-02 | `Workspace` | [Task_21_2026-11-02.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_21_2026-11-02.md) | Real-Time WebSocket Multiplayer & Free Online Sharing (Cloudflare Tunnel) |
| **22** | 2026-11-03 | `Workspace` | [Task_22_2026-11-03.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_22_2026-11-03.md) | Removal of Hints and Tags from In-Game Question Display |
| **23** | 2026-11-03 | `Workspace` | [Task_23_2026-11-03.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_23_2026-11-03.md) | Excel Template Harmonization (Optional 'tag' Column) & Flexible Import |
| **24** | 2026-11-04 | `Workspace` | [Task_24_2026-11-04.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_24_2026-11-04.md) | Full Question Export, Markdown Table Import (.md), Visual Preview & Permanent Removal of 'Indice' (Hint) Column |
| **25** | 2026-11-05 | `Workspace` | [Task_25_2026-11-05.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/Task_25_2026-11-05.md) | CSV Import/Export, Question/Category Deletion & Strict Difficulty Ordering (Easy, Normal, Hard) |

---

### Additional Resources
- [IMPROVEMENT_IDEAS.md](file:///c:/Users/bapti/Desktop/Moi/Projet-Perso/Personnal-website-project/documentation/en/IMPROVEMENT_IDEAS.md): Strategic roadmap and game mode concepts.

