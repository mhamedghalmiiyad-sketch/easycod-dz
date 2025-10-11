import { PrismaClient } from "@prisma/client";

// This is a singleton pattern to ensure we only have one PrismaClient
// instance in development, which is important for hot-reloading.
let db: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
} else {
  // In development, use the global variable to avoid creating new connections
  // on every code change.
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  db = global.__db__;
}

// Optional: connect to the database immediately upon module load.
// This can help surface connection errors early.
db.$connect().catch((err: any) => {
  console.error("Failed to connect to database:", err);
});

// Use a default export to allow for `import db from ...` syntax.
export default db;