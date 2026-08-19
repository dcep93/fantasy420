import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PlayerStatsRecord,
  refreshCompletedSeason,
  WrappedSeasonSnapshot,
} from "../src/fantasy420/app/Wrapped/tabs/PlayerStats/refreshSnapshot";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const snapshotPath = resolve(
  scriptDirectory,
  "../src/fantasy420/app/Wrapped/tabs/PlayerStats/data.json"
);
const wrapped2025Path = resolve(
  scriptDirectory,
  "../src/fantasy420/app/Wrapped/dataJson/2025.json"
);
const temporaryPath = `${snapshotPath}.${process.pid}.tmp`;

const [snapshot, wrapped2025] = await Promise.all([
  readJson<PlayerStatsRecord[]>(snapshotPath),
  readJson<WrappedSeasonSnapshot>(wrapped2025Path),
]);
const refreshed = refreshCompletedSeason(snapshot, wrapped2025);

try {
  await writeFile(temporaryPath, `${JSON.stringify(refreshed, null, 2)}\n`);
  await rename(temporaryPath, snapshotPath);
} catch (error) {
  await unlink(temporaryPath).catch(() => undefined);
  throw error;
}

console.log(
  `Updated ${snapshotPath} with ${refreshed.length} player records through 2025.`
);

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}
