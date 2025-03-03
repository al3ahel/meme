import { useState, useEffect } from 'react'
import CoinCreator from './components/CoinCreator'
import CoinDashboard from './components/CoinDashboard'
import SocialMediaMonitor from './components/SocialMediaMonitor'
import Settings from './components/Settings'
import db from './db'
import './App.css'

function App() {
  const [coins, setCoins] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [currentView, setCurrentView] = useState('dashboard')

  useEffect(() => {
    const coins = db.prepare('SELECT * FROM coins ORDER BY created_at DESC').all()
    setCoins(coins)
  }, [])

  return (
    <div className="app">
      <nav className="navbar">
        <h1>Memecoin Generator</h1>
        <div className="nav-links">
          <button onClick={() => setCurrentView('dashboard')}>Dashboard</button>
          <button onClick={() => setCurrentView('create')}>Create Coin</button>
          <button onClick={() => setCurrentView('monitor')}>Social Trends</button>
          <button onClick={() => setCurrentView('settings')}>Settings</button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && <CoinDashboard coins={coins} />}
        {currentView === 'create' && <CoinCreator suggestions={suggestions} setCoins={setCoins} />}
        {currentView === 'monitor' && <SocialMediaMonitor setSuggestions={setSuggestions} />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App
