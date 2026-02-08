import Link from "next/link";
import { readReleases } from "@/lib/releases";

export default async function ChangelogPage() {
  const releases = await readReleases();
  const sorted = [...releases].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );

  return (
    <main className="changelogListPage">
      <header className="changelogListHeader">
        <Link href="/" className="changelogListBack">
          ← Home
        </Link>
        <h1 className="changelogListTitle">Changelog</h1>
        <p className="changelogListSub">
          Published release notes (date range, changes, impact).
        </p>
      </header>

      {sorted.length === 0 ? (
        <p className="changelogListEmpty">
          No releases yet. Publish from the developer tool.
        </p>
      ) : (
        <ul className="changelogListUl">
          {sorted.map((r) => (
            <li key={r.id} className="changelogListLi">
              <Link href={`/changelog/${r.id}`} className="changelogListLink">
                <span className="changelogListItemTitle">
                  {r.title ?? "Untitled release"}
                </span>
                <div className="changelogListItemMeta">
                  {r.dateRange ?? "—"} {r.repo ? ` · ${r.repo}` : ""}
                </div>
                {r.createdAt && (
                  <div className="changelogListItemDate">
                    Published {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
