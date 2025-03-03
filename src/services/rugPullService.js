import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { config } from '../config'
import db from '../db'

export async function executeRugPull(coinId) {
  const connection = new Connection(config.rpcUrl)
  
  // Get all wallets
  const burners = db.prepare(`
    SELECT * FROM wallets 
    WHERE coin_id = ? AND type = 'burner'
  `).all(coinId)

  const exits = db.prepare(`
    SELECT * FROM wallets 
    WHERE coin_id = ? AND type = 'exit'
  `).all(coinId)

  const coinWallet = db.prepare(`
    SELECT * FROM wallets 
    WHERE coin_id = ? AND type = 'coin'
  `).get(coinId)

  const mainWallet = db.prepare(`
    SELECT * FROM wallets 
    WHERE coin_id = ? AND type = 'main'
  `).get(coinId)

  // Phase 1: Burner sell-off
  for (const burner of burners) {
    const amount = burner.balance
    const exitWallet = exits[Math.floor(Math.random() * exits.length)]
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(burner.public_key),
        toPubkey: new PublicKey(exitWallet.public_key),
        lamports: amount
      })
    )

    await new Promise(resolve => 
      setTimeout(resolve, Math.random() * 5000)
    )
  }

  // Phase 2: Coin wallet transfer
  if (coinWallet) {
    const coinExitWallet = exits[Math.floor(Math.random() * exits.length)]
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(coinWallet.public_key),
        toPubkey: new PublicKey(coinExitWallet.public_key),
        lamports: coinWallet.balance
      })
    )

    await new Promise(resolve => 
      setTimeout(resolve, Math.random() * 3000)
    )
  }

  // Phase 3: Exit wallet consolidation
  for (const exit of exits) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(exit.public_key),
        toPubkey: new PublicKey(mainWallet.public_key),
        lamports: exit.balance
      })
    )

    await new Promise(resolve => 
      setTimeout(resolve, Math.random() * 3000)
    )
  }

  // Update coin status
  db.prepare(`
    UPDATE coins SET status = 'rugpulled' 
    WHERE id = ?
  `).run(coinId)
}
