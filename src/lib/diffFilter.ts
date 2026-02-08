export type FileDiff = {
  filename: string;
  patch: string | null;
  changes: number;
  additions: number;
  deletions: number;
};

const NOISE_PATTERNS = [
  /\.md$/i,
  /^docs\//i,
  /^tests?\//i,
  /\.test\./i,
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /poetry\.lock$/i,
];

export function filterAndBudget(
  files: FileDiff[],
  opts: { ignoreNoise: boolean; maxFiles: number; maxPatchChars: number }
) {
  let keep = files.filter((f) => !!f.patch);

  if (opts.ignoreNoise) {
    keep = keep.filter((f) => !NOISE_PATTERNS.some((p) => p.test(f.filename)));
  }

  keep.sort((a, b) => (b.changes ?? 0) - (a.changes ?? 0));

  const selected: FileDiff[] = [];
  let used = 0;

  for (const f of keep) {
    if (selected.length >= opts.maxFiles) break;
    const patch = f.patch ?? "";
    if (used + patch.length > opts.maxPatchChars) continue;
    selected.push(f);
    used += patch.length;
  }

  return { selected, droppedCount: Math.max(0, keep.length - selected.length) };
}
