import * as SQLite from 'expo-sqlite';
import { applyMigrations } from './migrate';

let database: SQLite.SQLiteDatabase | null = null;

/** Opens the local database and brings it up to date. */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  const db = await SQLite.openDatabaseAsync('picksel.db');
  await db.execAsync('pragma journal_mode = WAL; pragma foreign_keys = on;');
  await applyMigrations(db);

  database = db;
  return db;
}

/** Test seam: forget the open handle so the next call reopens. */
export function resetDatabaseHandle(): void {
  database = null;
}
