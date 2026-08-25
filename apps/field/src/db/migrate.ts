import { MIGRATIONS } from './schema';
import type { LocalDatabase } from './types';

/**
 * Bring a database up to date.
 *
 * Migrations are an ordered list applied by index against PRAGMA user_version,
 * so a device that stopped halfway resumes where it left off rather than
 * replaying what it already has. Adding a migration means appending a string.
 * Do not reach for a migration library until that stops being enough.
 *
 * Kept apart from `client.ts` because that module binds to expo-sqlite, and
 * importing it drags in the whole React Native runtime. This is exactly the
 * code that silently corrupts a device if it steps wrong, so it must stay
 * testable on its own.
 */
export async function applyMigrations(
  db: LocalDatabase,
  migrations: readonly string[] = MIGRATIONS,
): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('pragma user_version', []);
  const applied = row?.user_version ?? 0;

  for (let version = applied; version < migrations.length; version += 1) {
    const migration = migrations[version];
    if (migration === undefined) continue;
    // One transaction per migration: a failure rolls that step back whole, and
    // user_version is only bumped once it has committed, so a crash mid-way
    // leaves the device pointing at the last migration that actually finished.
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
    });
    await db.execAsync(`pragma user_version = ${version + 1}`);
  }

  return migrations.length;
}
