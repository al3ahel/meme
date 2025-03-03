import { useState } from 'react'
import db from '../db'

export default function Settings() {
  const [apiKeys, setApiKeys] = useState({
    huggingFace: '',
    pinata: ''
  })

  const handleSave = () => {
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES ('huggingFace', ?), ('pinata', ?)
    `).run(apiKeys.huggingFace, apiKeys.pinata)
  }

  return (
    <div className="settings">
      <h2>API Settings</h2>
      <div className="form-group">
        <label>Hugging Face Token</label>
        <input 
          type="password"
          value={apiKeys.huggingFace}
          onChange={e => setApiKeys(prev => ({
            ...prev,
            huggingFace: e.target.value
          }))}
        />
      </div>
      <div className="form-group">
        <label>Pinata API Key</label>
        <input 
          type="password"
          value={apiKeys.pinata}
          onChange={e => setApiKeys(prev => ({
            ...prev,
            pinata: e.target.value
          }))}
        />
      </div>
      <button onClick={handleSave}>Save Settings</button>
    </div>
  )
}
