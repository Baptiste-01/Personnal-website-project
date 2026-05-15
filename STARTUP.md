# Starting the Project

## Prérequis

1. **Démarrer Docker** (PostgreSQL) :
   ```bash
   bun run docker:up
   ```

2. **Pousser le schéma** (première fois seulement) :
   ```bash
   bun run db:push
   ```

3. **Lancer le projet** :
   ```bash
   bun run dev
   ```

---

## Import de questions (Excel)

Accède à **http://localhost:5173/admin** pour importer des questions via fichier `.xlsx`.

- Un onglet du fichier = une catégorie (`geographie`, `histoire`, `sciences`, `cinema`, `musique`, `sport`, `litterature`, `gastronomie`)
- Télécharge le template depuis la page Admin
- L'import fait un **upsert** (insert si nouvelle, update si elle existe déjà)

### Endpoints Admin (API)
| Méthode | URL | Description |
|---|---|---|
| `POST` | `/admin/import` | Import fichier xlsx |
| `GET` | `/admin/template` | Télécharger le template |
| `GET` | `/admin/stats` | Stats questions par catégorie |

---

## Scripts disponibles

### Root Directory
- `bun run dev`: Démarre API + Web en parallèle
- `bun run build`: Build tous les packages
- `bun run db:push`: Push le schéma Prisma
- `bun run db:studio`: Ouvre Prisma Studio
- `bun run docker:up`: Démarre la base de données PostgreSQL (Docker)
- `bun run docker:down`: Arrête la base de données PostgreSQL (Docker)
- `bun run docker:status`: Affiche l'état des conteneurs Docker

### API (`apps/api`)
- `bun run --hot index.ts`: API en mode hot-reload

### Web (`apps/web`)
- `bun run dev`: Vite dev server
- `bun run build`: Build React

---

## URLs de développement
| Service | URL |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Admin (import) | http://localhost:5173/admin |
