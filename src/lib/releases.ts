import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "releases.json");

export type ReleaseEntry = {
  id?: string;
  createdAt?: string;
  title?: string;
  dateRange?: string;
  repo?: string;
  base?: string;
  head?: string;
  changes?: string[];
  impact?: string[];
  risks?: string[];
  [key: string]: unknown;
};

export async function readReleases(): Promise<ReleaseEntry[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ReleaseEntry[];
  } catch {
    return [];
  }
}

export async function getReleaseById(id: string): Promise<ReleaseEntry | null> {
  const items = await readReleases();
  return items.find((r) => r.id === id) ?? null;
}
