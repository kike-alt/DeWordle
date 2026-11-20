// Export game statistics as JSON or CSV. Closes #1603.
export interface GameRecord {
  date: string; // YYYY-MM-DD
  won: boolean;
  guesses: number;
  streak?: number;
}

export const toJson = (records: GameRecord[]) =>
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      games: records,
      played: records.length,
      winRate: records.length ? records.filter((r) => r.won).length / records.length : 0,
    },
    null,
    2,
  );

// Values are quoted so commas never break a column.
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const toCsv = (records: GameRecord[]) =>
  [
    "date,won,guesses,streak",
    ...records.map((r) => [r.date, r.won, r.guesses, r.streak ?? ""].map(cell).join(",")),
  ].join("\n");

export function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportAsJson = (records: GameRecord[]) =>
  downloadFile("dewordle-stats.json", toJson(records), "application/json");

export const exportAsCsv = (records: GameRecord[]) =>
  downloadFile("dewordle-stats.csv", toCsv(records), "text/csv");
