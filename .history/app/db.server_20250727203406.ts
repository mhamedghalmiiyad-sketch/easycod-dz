// app/db.server.ts
import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db__: PrismaClient | undefined;
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll just open a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient();
  db.$connect(); // Optional: Explicitly connect
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
    global.__db__.$connect(); // Optional: Explicitly connect
  }
  db = global.__db__;
}

export default db;