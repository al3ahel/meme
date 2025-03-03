import { config } from '../config'
import { pipeline } from '@huggingface/transformers'
import { createClient } from 'praw-reddit'

const sentimentAnalyzer = await pipeline('sentiment-analysis', 'distilbert-base-uncased-finetuned-sst-2-english')

export async function monitorSocialMedia() {
  const xHeaders = { 'Authorization': `Bearer ${config.xApiKey}` }
  const redditClient = new createClient({
    clientId: config.redditClientId,
    clientSecret: config.redditClientSecret,
    userAgent: 'MemeCoinCreator/1.0'
  })

  while (true) {
    try {
      const xResponse = await fetch('https://api.twitter.com/2/users/44196397/tweets?max_results=5', { headers: xHeaders })
      const xTweets = await xResponse.json()
      
      for (const tweet of xTweets.data || []) {
        const sentiment = await sentimentAnalyzer(tweet.text)
        const likes = tweet.public_metrics?.like_count || 0
        
        if (sentiment[0].label === 'POSITIVE' && sentiment[0].score > 0.7 && likes > 100) {
          const coinMatch = tweet.text.match(/[A-Za-z]+Coin\b/i)
          if (coinMatch) {
            return {
              coinName: coinMatch[0],
              source: 'X',
              content: tweet.text
            }
          }
        }
      }

      const redditPosts = await redditClient.getSubreddit('CryptoCurrency').getHot({ limit: 5 })
      for (const post of redditPosts) {
        const sentiment = await sentimentAnalyzer(post.title)
        if (sentiment[0].label === 'POSITIVE' && sentiment[0].score > 0.7 && post.ups > 50) {
          const coinMatch = post.title.match(/[A-Za-z]+Coin\b/i)
          if (coinMatch) {
            return {
              coinName: coinMatch[0],
              source: 'Reddit',
              content: post.title
            }
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (error) {
      console.error('Social media monitoring error:', error)
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }
}
