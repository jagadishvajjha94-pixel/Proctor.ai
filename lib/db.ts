import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Use placeholder URL during build when DATABASE_URL is unset (e.g. Vercel build); runtime uses real URL from env
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder"

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: databaseUrl },
    },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
