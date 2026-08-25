/**
 * Money is integer pence everywhere. These are the only two places it becomes
 * a string, so a rounding decision cannot be made twice differently.
 */
export function poundsFromPence(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

export interface PayLine {
  label: string;
  pence: number;
}

/** "£100 audit + £15 travel uplift" — the itemisation the design requires. */
export function payBreakdown(lines: readonly PayLine[]): string {
  return lines.map((line) => `${poundsFromPence(line.pence)} ${line.label}`).join(' + ');
}

export function totalPence(lines: readonly PayLine[]): number {
  return lines.reduce((sum, line) => sum + line.pence, 0);
}
