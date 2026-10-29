import { defineConfig } from "prisma/config"

// DATABASE_URL is injected via --env-file=.env (project root)
// See package.json root: "db:push" and "db:studio"
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
