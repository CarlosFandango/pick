import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Opens the local database and brings it up to date.
 *
 * Migrations are an ordered list applied by index against PRAGMA user_version.
 * Adding one means appending a string. Do not reach for a migration library
 * until that stops being enough.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  const db = await SQLite.openDatabaseAsync('picksel.db');
  await db.execAsync('pragma journal_mode = WAL; pragma foreign_keys = on;');

  const row = await db.getFirstAsync<{ user_version: number }>('pragma user_version');
  const applied = row?.user_version ?? 0;

  for (let version = applied; version < MIGRATIONS.length; version += 1) {
    const migration = MIGRATIONS[version];
    if (!migration) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
    });
    await db.execAsync(`pragma user_version = ${version + 1}`);
  }

  database = db;
  return db;
}

/** Test seam: forget the open handle so the next call reopens. */
export function resetDatabaseHandle(): void {
  database = null;
}
