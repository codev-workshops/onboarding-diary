import { useState } from 'react'
import ThemeToggle from './components/ThemeToggle.jsx'
import { useTheme } from './context/theme-context.js'
import './App.css'

const SWATCHES = [
  { label: 'Primary', className: 'status-primary' },
  { label: 'Secondary', className: 'status-secondary' },
  { label: 'Accent', className: 'status-accent' },
  { label: 'Success', className: 'status-success' },
  { label: 'Warning', className: 'status-warning' },
  { label: 'Error', className: 'status-error' },
]

function App() {
  const { theme } = useTheme()
  const [entries, setEntries] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Onboarding Diary</h1>
        <ThemeToggle />
      </header>

      <p className="tagline">
        Document your onboarding journey. Current theme: <strong>{theme}</strong>
      </p>

      <section className="card">
        <h2>Diary entries</h2>
        <button onClick={() => setEntries((current) => current + 1)}>
          Entries logged: {entries}
        </button>
        <p className="tagline">
          Edit <code>src/App.jsx</code> and save to test HMR.
        </p>
      </section>

      <section className="card">
        <h2>Theme palette</h2>
        <ul className="swatches">
          {SWATCHES.map(({ label, className }) => (
            <li key={label} className={`swatch ${className}`}>
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default App
