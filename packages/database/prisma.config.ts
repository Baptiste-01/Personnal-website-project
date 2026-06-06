import { defineConfig } from "prisma/config"

// DATABASE_URL est injecté via --env-file=.env (racine du projet)
// Voir package.json root : "db:push" et "db:studio"
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
