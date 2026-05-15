# Starting the Project

## Prerequisites

1. **Start Docker** (PostgreSQL):
   ```bash
   bun run docker:up
   ```

2. **Push the schema** (first time only):
   ```bash
   bun run db:push
   ```

3. **Launch the project**:
   ```bash
   bun run dev
   ```

---

## Question Import (Excel)

Access **http://localhost:5173/admin** to import questions via `.xlsx` files.

- Each tab in the file corresponds to a category. 
- **Important:** Category names (sheet names) and column headers are in French as expected by the backend:
  - **Categories:** `geographie`, `histoire`, `sciences`, `cinema`, `musique`, `sport`, `litterature`, `gastronomie`.
  - **Headers:** `question`, `réponse`, `réponses_acceptées`, `indice`, `difficulté`.
- Download the template from the Admin page for a ready-to-use structure.
- The import performs an **upsert** (inserts if new, updates if it already exists).

### Admin Endpoints (API)
| Method | URL | Description |
|---|---|---|
| `POST` | `/admin/import` | Import xlsx file |
| `GET` | `/admin/template` | Download template |
| `GET` | `/admin/stats` | Question stats per category |

---

## Available Scripts

### Root Directory
- `bun run dev`: Starts API + Web in parallel
- `bun run build`: Builds all packages
- `bun run db:push`: Pushes the Prisma schema
- `bun run db:studio`: Opens Prisma Studio
- `bun run docker:up`: Starts the PostgreSQL database (Docker)
- `bun run docker:down`: Stops the PostgreSQL database (Docker)
- `bun run docker:status`: Shows Docker container status

### API (`apps/api`)
- `bun run --hot index.ts`: API in hot-reload mode

### Web (`apps/web`)
- `bun run dev`: Vite dev server
- `bun run build`: Builds React app

---

## Development URLs
| Service | URL |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Admin (import) | http://localhost:5173/admin |
