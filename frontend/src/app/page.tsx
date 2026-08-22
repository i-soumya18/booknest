export default function HomePage() {
  return (
    <main style={{ padding: "4rem 2rem", textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📚 BookNest</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", marginBottom: "2rem" }}>
        Production-minded reading tracker web app.
      </p>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "1.5rem",
          textAlign: "left",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>System Status</h2>
        <p style={{ color: "var(--success-color)", fontWeight: 600 }}>🟢 Phase 0 Active: Scaffolding Ready</p>
      </div>
    </main>
  );
}
