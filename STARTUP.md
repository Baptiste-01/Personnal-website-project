# Starting the Project

To start both the **API** and the **Web** application concurrently, run the following command from the root directory:

```bash
bun run dev
```

## Available Scripts

### Root Directory
- `bun run dev`: Starts both API and Web in development mode.
- `bun run build`: Builds all packages and applications.
- `bun run db:push`: Pushes the Prisma schema to the database.
- `bun run db:studio`: Opens Prisma Studio.

### API (`apps/api`)
- `bun run --hot index.ts`: Starts the API with hot reloading.

### Web (`apps/web`)
- `bun run dev`: Starts the Vite development server.
- `bun run build`: Builds the React application.
