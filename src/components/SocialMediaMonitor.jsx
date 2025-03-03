import { useState, useEffect } from 'react'
import { monitorSocialMedia } from '../services/socialMedia'

export default function SocialMediaMonitor({ setSuggestions }) {
  const [trends, setTrends] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    if (isMonitoring) {
      const monitor = async () => {
        const trend = await monitorSocialMedia()
        setTrends(prev => [trend, ...prev].slice(0, 10))
        setSuggestions(prev => [trend, ...prev].slice(0, 10))
      }
      
      const interval = setInterval(monitor, 10000)
      return () => clearInterval(interval)
    }
  }, [isMonitoring, setSuggestions])

  return (
    <div className="monitor">
      <h2>Social Media Trends</h2>
      <button onClick={() => setIsMonitoring(!isMonitoring)}>
        {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
      </button>
      
      <div className="trends-list">
        {trends.map((trend, i) => (
          <div key={i} className="trend">
            <h3>{trend.coinName}</h3>
            <p>Source: {trend.source}</p>
            <p>{trend.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
