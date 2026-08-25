/** What SQLite can store in a bound parameter. */
export type BindValue = string | number | boolean | null | Uint8Array;

/**
 * The slice of expo-sqlite's `SQLiteDatabase` this app actually uses.
 *
 * Depending on the narrow type rather than the whole class is what lets the
 * sync and migration logic be tested without a device, a simulator or the Expo
 * runtime. `SQLiteDatabase` satisfies this structurally.
 *
 * `params` is required rather than optional: expo-sqlite overloads these with
 * an array form and a variadic form, and an optional array matches neither.
 * Callers pass `[]` when there is nothing to bind.
 */
export interface LocalDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
  runAsync(source: string, params: BindValue[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
