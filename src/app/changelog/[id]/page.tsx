import Link from "next/link";
import { notFound } from "next/navigation";
import { getReleaseById } from "@/lib/releases";

export default async function ChangelogReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = await getReleaseById(id);
  if (!release) notFound();

  const changes = Array.isArray(release.changes) ? release.changes : [];
  const impact = Array.isArray(release.impact) ? release.impact : [];

  return (
    <main className="changelogRelease">
      <header className="changelogReleaseHeader">
        <Link href="/changelog" className="changelogBack">
          ← Changelog
        </Link>
        <h1 className="changelogTitle">
          {release.title ?? "Untitled release"}
        </h1>
        <div className="changelogMeta">
          <strong>Date range:</strong> {release.dateRange ?? "—"}
        </div>
        {release.repo && (
          <div className="changelogRepo">Repo: {release.repo}</div>
        )}
        {release.createdAt && (
          <div className="changelogPublished">
            Published {new Date(release.createdAt).toLocaleString()}
          </div>
        )}
      </header>

      <section className="changelogSections">
        <div className="changelogBlock">
          <h2 className="changelogBlockTitle">Changes</h2>
          {changes.length === 0 ? (
            <p className="changelogEmpty">—</p>
          ) : (
            <ul className="changelogList">
              {changes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="changelogBlock">
          <h2 className="changelogBlockTitle">Impact</h2>
          {impact.length === 0 ? (
            <p className="changelogEmpty">—</p>
          ) : (
            <ul className="changelogList">
              {impact.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
