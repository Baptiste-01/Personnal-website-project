import { defineConfig } from "prisma/config"

let databaseUrl = process.env["DATABASE_URL"] || ""
// Neon defaults to appending channel_binding=require which breaks Prisma CLI
if (databaseUrl.includes("channel_binding=")) {
  databaseUrl = databaseUrl.replace(/[?&]channel_binding=[^&]+/, "").replace(/\?$/, "")
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
})
