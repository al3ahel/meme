import { config } from '../config'

export async function generateCoinImage(coinName) {
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.huggingFaceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: coinName
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate image')
    }
    
    return await response.blob()
  } catch (error) {
    console.error('AI image generation failed:', error)
    throw error
  }
}
