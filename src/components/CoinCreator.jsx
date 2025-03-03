import { useState } from 'react'
import { createToken } from '../services/tokenService'
import db from '../db'

export default function CoinCreator({ suggestions, setCoins }) {
  const [coinData, setCoinData] = useState({
    name: '',
    symbol: '',
    supply: 1000000,
    liquidity: 1,
    distribution: {
      beneficiaries: [],
      timePeriods: 4
    }
  })

  const handleCreate = async () => {
    const result = await createToken(coinData)
    if (result.success) {
      const stmt = db.prepare(`
        INSERT INTO coins (name, symbol, icon_url, status)
        VALUES (?, ?, ?, 'created')
      `)
      const info = stmt.run(coinData.name, coinData.symbol, result.data.iconUri)
      setCoins(prev => [...prev, {
        id: info.lastInsertRowid,
        ...coinData,
        status: 'created',
        icon_url: result.data.iconUri
      }])
    }
  }

  return (
    <div className="creator">
      <h2>Create New Coin</h2>
      <div className="suggestions">
        {suggestions.map((suggestion, i) => (
          <button key={i} onClick={() => setCoinData({
            name: suggestion.coinName,
            symbol: suggestion.coinName.slice(0,4).toUpperCase(),
            icon: suggestion.coinIconUri
          })}>
            Use Suggestion: {suggestion.coinName}
          </button>
        ))}
      </div>
      <input 
        type="text" 
        placeholder="Coin Name" 
        value={coinData.name}
        onChange={e => setCoinData(prev => ({...prev, name: e.target.value}))}
      />
      <input 
        type="text" 
        placeholder="Symbol" 
        value={coinData.symbol}
        onChange={e => setCoinData(prev => ({...prev, symbol: e.target.value}))}
      />
      <input 
        type="number" 
        placeholder="Total Supply" 
        value={coinData.supply}
        onChange={e => setCoinData(prev => ({...prev, supply: e.target.value}))}
      />
      <input 
        type="number" 
        placeholder="Liquidity (SOL)" 
        value={coinData.liquidity}
        onChange={e => setCoinData(prev => ({...prev, liquidity: e.target.value}))}
      />
      <div className="distribution">
        <h3>Token Distribution</h3>
        <input 
          type="number" 
          placeholder="Vesting Periods" 
          value={coinData.distribution.timePeriods}
          onChange={e => setCoinData(prev => ({
            ...prev,
            distribution: {
              ...prev.distribution,
              timePeriods: e.target.value
            }
          }))}
        />
      </div>
      <button onClick={handleCreate}>Create Coin</button>
    </div>
  )
}
