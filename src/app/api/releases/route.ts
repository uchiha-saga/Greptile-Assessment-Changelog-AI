import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "releases.json");

type ReleaseEntry = { id?: string; createdAt?: string; [key: string]: unknown };

async function readAll(): Promise<ReleaseEntry[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ReleaseEntry[];
  } catch {
    return [];
  }
}

async function writeAll(items: ReleaseEntry[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function GET() {
  const items = await readAll();
  // newest first
  items.sort((a: ReleaseEntry, b: ReleaseEntry) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = await readAll();
    const id = `${Date.now()}`;

    const entry = {
      id,
      createdAt: new Date().toISOString(),
      ...body,
    };

    items.push(entry);
    await writeAll(items);

    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
