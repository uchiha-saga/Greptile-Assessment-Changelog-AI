"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type CompareResponse = {
  owner: string;
  repo: string;
  base: string;
  head: string;
  commits: { sha: string; message: string; author: string; date: string }[];
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch: string | null;
  }[];
};

type GenerateResponse = {
  title: string;
  changes: string[];
  impact: string[];
  risks: string[];
};

const DEFAULT_REPO = "https://github.com/greptileai/superagent";

const DAY_PRESETS = [
  { label: "Last 5 days", value: 5 },
  { label: "Last 10 days", value: 10 },
  { label: "Last 20 days", value: 20 },
  { label: "Last 30 days", value: 30 },
] as const;

function formatDateForInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DevAppPage() {
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO);
  const [token, setToken] = useState("");
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [days, setDays] = useState<number>(20);
  const [since, setSince] = useState(() =>
    formatDateForInput(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000))
  );
  const [until, setUntil] = useState(() => formatDateForInput(new Date()));
  const [ignoreNoise, setIgnoreNoise] = useState(true);

  const [loading, setLoading] = useState(false);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCommits = useMemo(() => {
    if (!compare) return [];
    return compare.commits.filter((c) => selected[c.sha] !== false);
  }, [compare, selected]);

  const selectedFiles = useMemo(() => {
    if (!compare) return [];
    return compare.files.filter((f) => selected[f.filename] !== false);
  }, [compare, selected]);

  async function onFetchCompare() {
    setError(null);
    setDraft(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { repoUrl, token };
      if (rangeMode === "preset") {
        body.days = days;
      } else {
        body.since = new Date(since).toISOString();
        body.until = new Date(until + "T23:59:59.999Z").toISOString();
      }
      const r = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Compare failed");

      setCompare(data);
      // default: everything selected
      const sel: Record<string, boolean> = {};
      for (const c of data.commits) sel[c.sha] = true;
      for (const f of data.files) sel[f.filename] = true;
      setSelected(sel);
    } catch (e: any) {
      setError(e.message);
      setCompare(null);
    } finally {
      setLoading(false);
    }
  }

  async function onGenerate() {
    if (!compare) return;
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: `${compare.owner}/${compare.repo}`,
          base: compare.base,
          head: compare.head,
          ignoreNoise,
          commits: selectedCommits,
          files: selectedFiles,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Generate failed");

      setDraft(data);
    } catch (e: any) {
      setError(e.message);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }

  async function onPublish() {
    if (!draft || !compare) return;
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: `${compare.owner}/${compare.repo}`,
          base: compare.base,
          head: compare.head,
          ...draft,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Publish failed");
      // open public page
      window.location.href = `/changelog/${data.id}`;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>AI Changelog Generator</h1>
          <p className={styles.sub}>
            Developer tool: select a repo + range, generate Changes / Impact /
            Potential Risks, then publish.
          </p>
        </div>
        <a className={styles.link} href="/changelog">
          View public changelog →
        </a>
      </header>

      <section className={styles.card}>
        <div className={styles.grid2}>
          <label className={styles.label}>
            Repo URL
            <input
              className={styles.input}
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            GitHub PAT (needed for private / higher rate limit)
            <input
              className={styles.input}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
            />
          </label>

          <div className={`${styles.label} ${styles.timeRangeSection}`}>
            Time range
            <div className={styles.rangeRow}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="rangeMode"
                  checked={rangeMode === "preset"}
                  onChange={() => setRangeMode("preset")}
                />
                Preset
              </label>
              <select
                className={styles.select}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={rangeMode !== "preset"}
              >
                {DAY_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.rangeRow} style={{ marginTop: 8 }}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="rangeMode"
                  checked={rangeMode === "custom"}
                  onChange={() => setRangeMode("custom")}
                />
                Custom
              </label>
              <input
                type="date"
                className={styles.dateInput}
                value={since}
                onChange={(e) => setSince(e.target.value)}
                disabled={rangeMode !== "custom"}
              />
              <span className={styles.rangeTo}>to</span>
              <input
                type="date"
                className={styles.dateInput}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                disabled={rangeMode !== "custom"}
              />
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={ignoreNoise}
              onChange={(e) => setIgnoreNoise(e.target.checked)}
            />
            Ignore noise (docs/tests/lockfiles)
          </label>

          <div className={styles.rowRight}>
            <button
              className={styles.button}
              onClick={onFetchCompare}
              disabled={loading}
            >
              {loading ? "Working..." : "Fetch changes"}
            </button>
            <button
              className={styles.buttonPrimary}
              onClick={onGenerate}
              disabled={loading || !compare}
              title={!compare ? "Fetch changes first" : ""}
            >
              Generate draft
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </section>

      {compare && (
        <section className={styles.split}>
          <div className={styles.pane}>
            <h2 className={styles.h2}>Sources</h2>

            <div className={styles.block}>
              <h3 className={styles.h3}>Commits ({compare.commits.length})</h3>
              <div className={styles.list}>
                {compare.commits.map((c) => (
                  <label key={c.sha} className={styles.item}>
                    <input
                      type="checkbox"
                      checked={selected[c.sha] !== false}
                      onChange={(e) =>
                        setSelected((s) => ({
                          ...s,
                          [c.sha]: e.target.checked,
                        }))
                      }
                    />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{c.message}</div>
                      <div className={styles.itemMeta}>
                        {c.author || "unknown"} ·{" "}
                        {new Date(c.date).toLocaleString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.block}>
              <h3 className={styles.h3}>Files ({compare.files.length})</h3>
              <div className={styles.list}>
                {compare.files.map((f) => (
                  <label key={f.filename} className={styles.item}>
                    <input
                      type="checkbox"
                      checked={selected[f.filename] !== false}
                      onChange={(e) =>
                        setSelected((s) => ({
                          ...s,
                          [f.filename]: e.target.checked,
                        }))
                      }
                    />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{f.filename}</div>
                      <div className={styles.itemMeta}>
                        {f.status} · +{f.additions} -{f.deletions} ·{" "}
                        {f.patch ? "diff available" : "no patch"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.pane}>
            <h2 className={styles.h2}>Draft</h2>

            {!draft ? (
              <div className={styles.placeholder}>
                Generate a draft to see Changes / Impact / Potential Risks here.
              </div>
            ) : (
              <>
                <label className={styles.label}>
                  Title
                  <input
                    className={styles.input}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                    }
                  />
                </label>

                <div className={styles.threeCols}>
                  <Section
                    title="Changes"
                    value={draft.changes}
                    onChange={(v) =>
                      setDraft((d) => (d ? { ...d, changes: v } : d))
                    }
                  />
                  <Section
                    title="Impact"
                    value={draft.impact}
                    onChange={(v) =>
                      setDraft((d) => (d ? { ...d, impact: v } : d))
                    }
                  />
                  <Section
                    title="Potential risks"
                    value={draft.risks}
                    onChange={(v) =>
                      setDraft((d) => (d ? { ...d, risks: v } : d))
                    }
                  />
                </div>

                <div className={styles.row}>
                  <button
                    className={styles.buttonPrimary}
                    onClick={onPublish}
                    disabled={loading}
                  >
                    Publish
                  </button>
                  <a
                    className={styles.link}
                    href="/changelog"
                    style={{ marginLeft: 12 }}
                  >
                    View changelog →
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Section({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text = value.join("\n");
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>{title}</div>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
        placeholder={`- ...\n- ...`}
      />
    </div>
  );
}
