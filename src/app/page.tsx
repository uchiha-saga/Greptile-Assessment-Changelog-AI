import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>AI Changelog Generator</h1>
          <p>
            Generate release notes from any Git repo: Changes, Impact, and Risks
            in one click.
          </p>
        </div>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/app">
            Open developer tool →
          </a>
          <a className={styles.secondary} href="/changelog">
            Changelog
          </a>
        </div>
      </main>
    </div>
  );
}
