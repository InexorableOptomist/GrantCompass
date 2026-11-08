type HealthResponse = { status: string }

export function App() {
  return (
    <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>GrantCompass 🧭</h1>
      <p>Local-first scholarship and grant assistant.</p>
      <section>
        <h2>Phase 1 Status</h2>
        <ul>
          <li>✅ Security foundation scaffolded</li>
          <li>✅ Encrypted local storage primitives added</li>
          <li>✅ FastAPI backend online</li>
        </ul>
      </section>
      <section>
        <h2>Next</h2>
        <p>Proceed to Phase 2: ingestion and profile normalization pipeline.</p>
      </section>
    </main>
  )
}
