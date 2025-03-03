import { Keypair } from '@solana/web3.js'
import db from '../db'

// Main wallet is stored in settings
// Coin wallet is created during token creation
// Burner and exit wallets are created separately

export function createBurnerWallets(count) {
  const wallets = []
  for (let i = 0; i < count; i++) {
    const wallet = Keypair.generate()
    wallets.push({
      publicKey: wallet.publicKey.toString(),
      secretKey: wallet.secretKey
    })
  }
  return wallets
}

export function createExitWallets(totalSol) {
  const walletCount = Math.floor(totalSol / 9)
  const wallets = []
  for (let i = 0; i < walletCount; i++) {
    const wallet = Keypair.generate()
    wallets.push({
      publicKey: wallet.publicKey.toString(),
      secretKey: wallet.secretKey
    })
  }
  return wallets
}

export function saveWallets(coinId, wallets, type) {
  const stmt = db.prepare(`
    INSERT INTO wallets (coin_id, public_key, secret_key, type)
    VALUES (?, ?, ?, ?)
  `)
  wallets.forEach(wallet => {
    stmt.run(coinId, wallet.publicKey, wallet.secretKey, type)
  })
}

export function getWallets(coinId, type) {
  return db.prepare(`
    SELECT * FROM wallets WHERE coin_id = ? AND type = ?
  `).all(coinId, type)
}
