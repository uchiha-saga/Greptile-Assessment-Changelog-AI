import { NextResponse } from "next/server";

function parseRepo(url: string) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  const parts = url.split("/");
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
  throw new Error("Invalid repo input. Use https://github.com/owner/repo or owner/repo");
}

const FROM_BEGINNING_SINCE = "2000-01-01T00:00:00Z";
const PER_PAGE = 100;
const MAX_PAGES = 30; // cap at 3000 commits to avoid rate limits and long waits

/** Resolve base and head from a date range, paginating to get all commits in range. */
async function resolveRange(
  owner: string,
  repo: string,
  headers: Record<string, string>,
  opts: { days?: number; since?: string; until?: string }
): Promise<{ base: string; head: string }> {
  let since: string;
  let until: string;
  if (opts.days === 0) {
    since = FROM_BEGINNING_SINCE;
    until = new Date().toISOString();
  } else if (opts.days != null && opts.days > 0) {
    const end = new Date();
    const start = new Date(end.getTime() - opts.days * 24 * 60 * 60 * 1000);
    since = start.toISOString();
    until = end.toISOString();
  } else if (opts.since && opts.until) {
    since = opts.since;
    until = opts.until;
  } else {
    throw new Error("Provide days or both since and until (ISO date strings)");
  }

  const allCommits: { sha: string }[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&per_page=${PER_PAGE}&page=${page}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(text || `GitHub commits list failed: ${r.status}`);
    }
    const chunk: { sha: string }[] = await r.json();
    allCommits.push(...chunk);
    if (chunk.length < PER_PAGE) break;
    page += 1;
  }

  if (!allCommits.length) {
    throw new Error("No commits in this date range. Try a wider range.");
  }

  const head = allCommits[0].sha;
  const base = allCommits[allCommits.length - 1].sha;
  return { base, head };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { repoUrl, token, base: baseIn, head: headIn, days, since, until } = body;
    const { owner, repo } = parseRepo(repoUrl);

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;

    let base: string;
    let head: string;
    if (baseIn != null && headIn != null) {
      base = baseIn;
      head = headIn;
    } else if (days != null || (since && until)) {
      const resolved = await resolveRange(owner, repo, headers, { days: days ?? undefined, since, until });
      base = resolved.base;
      head = resolved.head;
    } else {
      throw new Error("Provide base and head, or days (e.g. 20), or since and until.");
    }

    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      { headers }
    );

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: text }, { status: r.status });
    }

    const data = JSON.parse(text);

    return NextResponse.json({
      owner,
      repo,
      base,
      head,
      commits:
        data.commits?.map((c: any) => ({
          sha: c.sha,
          message: c.commit?.message?.split("\n")[0] ?? "",
          author: c.commit?.author?.name ?? "",
          date: c.commit?.author?.date ?? "",
        })) ?? [],
      files:
        data.files?.map((f: any) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch ?? null,
        })) ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
