export default function Home() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>🏥 MedConnect</h1>
      <p style={styles.subtitle}>Conectando médicos, pacientes e tecnologia.</p>
    </main>
  )
}

const styles = {
  main: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#64748b',
  },
}