import { createToken, distributeVestedTokens, releaseTokenBatches } from '../tokenCreation'
import { config } from '../config'
import { uploadToPinata } from '../tokenCreation'
import { generateCoinImage } from './aiService'

export async function createToken(coinData) {
  try {
    // Generate AI coin image
    const imageBlob = await generateCoinImage(coinData.name)
    const imageUri = await uploadToPinata(imageBlob, coinData.name)

    // Create token with metadata
    const result = await createToken({
      name: coinData.name,
      symbol: coinData.symbol,
      supply: coinData.supply,
      liquidity: coinData.liquidity,
      iconUri: imageUri
    }, config)

    // Distribute tokens
    if (coinData.distribution) {
      await distributeVestedTokens(
        result.mint,
        result.wallet,
        coinData.distribution.beneficiaries,
        coinData.supply,
        coinData.distribution.timePeriods
      )
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
