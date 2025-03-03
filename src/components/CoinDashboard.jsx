import { useEffect, useState } from 'react'
import db from '../db'
import { executeRugPull } from '../services/rugPullService'

export default function CoinDashboard({ coins }) {
  const [selectedCoin, setSelectedCoin] = useState(null)
  const [wallets, setWallets] = useState({ burners: [], exits: [] })

  useEffect(() => {
    if (selectedCoin) {
      const burners = db.prepare(`
        SELECT * FROM wallets WHERE coin_id = ? AND type = 'burner'
      `).all(selectedCoin.id)
      
      const exits = db.prepare(`
        SELECT * FROM wallets WHERE coin_id = ? AND type = 'exit'
      `).all(selectedCoin.id)
      
      setWallets({ burners, exits })
    }
  }, [selectedCoin])

  const handleRugPull = async (coinId) => {
    await executeRugPull(coinId)
    // Refresh wallets after rug pull
    const updatedExits = db.prepare(`
      SELECT * FROM wallets WHERE coin_id = ? AND type = 'exit'
    `).all(coinId)
    setWallets(prev => ({ ...prev, exits: updatedExits }))
  }

  return (
    <div className="dashboard">
      <h2>Your Coins</h2>
      <div className="coin-list">
        {coins.map(coin => (
          <div 
            key={coin.id} 
            className={`coin ${coin.status}`}
            onClick={() => setSelectedCoin(coin)}
          >
            <img src={coin.icon_url} alt={coin.name} />
            <h3>{coin.name} ({coin.symbol})</h3>
            <p>Status: {coin.status}</p>
            {coin.status === 'active' && (
              <button onClick={() => handleRugPull(coin.id)}>
                Execute Rug Pull
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedCoin && (
        <div className="wallet-details">
          <h3>Wallet Details for {selectedCoin.name}</h3>
          
          <div className="wallet-section">
            <h4>Burner Wallets</h4>
            <ul>
              {wallets.burners.map(wallet => (
                <li key={wallet.public_key}>
                  <span>Public Key: {wallet.public_key}</span>
                  <button onClick={() => navigator.clipboard.writeText(wallet.secret_key)}>
                    Copy Secret Key
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="wallet-section">
            <h4>Exit Wallets</h4>
            <ul>
              {wallets.exits.map(wallet => (
                <li key={wallet.public_key}>
                  <span>Public Key: {wallet.public_key}</span>
                  <button onClick={() => navigator.clipboard.writeText(wallet.secret_key)}>
                    Copy Secret Key
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
