import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import config from "./config.js";

const connection = new Connection(config.rpcEndpoint, "confirmed");

async function retryTransaction(tx, signers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const sig = await connection.sendTransaction(tx, signers);
      await connection.confirmTransaction({
        signature: sig,
        blockhash: tx.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
      });
      return sig;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} failed: ${error.message}. Retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export const createKeypair = () => {
  try {
    const privateKeyArray = bs58.decode(config.walletPrivateKey);
    return Keypair.fromSecretKey(privateKeyArray);
  } catch (error) {
    console.error("Error creating Phantom wallet keypair:", error.message);
    throw error;
  }
};

export const createCoinWallet = async (mainWallet, solAmount) => {
  try {
    const coinWallet = Keypair.generate();
    const solLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: coinWallet.publicKey,
        lamports: solLamports,
      })
    );
    await retryTransaction(tx, [mainWallet]);
    fs.appendFileSync("coin_wallet.txt", `${bs58.encode(coinWallet.secretKey)}\n`);
    console.log(`Coin wallet created and funded with ${solAmount} SOL: ${coinWallet.publicKey.toBase58()}`);
    return coinWallet;
  } catch (error) {
    console.error("Error creating coin wallet:", error.message);
    throw error;
  }
};

export const createBurnerWallets = async (count, mainWallet, solAmount) => {
  try {
    const burners = [];
    const solLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const fileStream = fs.createWriteStream("burner_wallets.txt", { flags: "a" });

    for (let i = 0; i < count; i++) {
      const burner = Keypair.generate();
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mainWallet.publicKey,
          toPubkey: burner.publicKey,
          lamports: solLamports,
        })
      );
      await retryTransaction(tx, [mainWallet]);
      burners.push(burner);
      fileStream.write(`${bs58.encode(burner.secretKey)}\n`);
    }

    fileStream.end();
    console.log(`Generated and funded ${count} burner wallets with ${solAmount} SOL each`);
    return burners;
  } catch (error) {
    console.error("Error creating burner wallets:", error.message);
    throw error;
  }
};

export const createBotWallets = async (mainWallet) => {
  try {
    const bots = [];
    const solLamports = BigInt(Math.floor(0.1 * LAMPORTS_PER_SOL)); // 0.1 SOL per bot
    const fileStream = fs.createWriteStream("bot_wallets.txt", { flags: "a" });

    for (let i = 0; i < 3; i++) {
      const bot = Keypair.generate();
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mainWallet.publicKey,
          toPubkey: bot.publicKey,
          lamports: solLamports,
        })
      );
      await retryTransaction(tx, [mainWallet]);
      bots.push(bot);
      fileStream.write(`${bs58.encode(bot.secretKey)}\n`);
    }

    fileStream.end();
    console.log("Generated and funded 3 bot wallets with 0.1 SOL each");
    return bots;
  } catch (error) {
    console.error("Error creating bot wallets:", error.message);
    throw error;
  }
};

export const createExitWallets = async (coinWallet, totalSol) => {
  try {
    const solPerWallet = totalSol * 0.09; // 9% per wallet
    const exitWalletCount = Math.ceil(totalSol / solPerWallet);
    const exitWallets = [];
    const solLamportsPerWallet = BigInt(Math.floor(solPerWallet * LAMPORTS_PER_SOL));
    const fileStream = fs.createWriteStream("exit_wallets.txt", { flags: "a" });

    for (let i = 0; i < exitWalletCount; i++) {
      const exitWallet = Keypair.generate();
      const remainingSol = await connection.getBalance(coinWallet.publicKey);
      const transferAmount = remainingSol > solLamportsPerWallet ? solLamportsPerWallet : BigInt(remainingSol - 5000);
      if (transferAmount > 0) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: coinWallet.publicKey,
            toPubkey: exitWallet.publicKey,
            lamports: transferAmount,
          })
        );
        await retryTransaction(tx, [coinWallet]);
        exitWallets.push(exitWallet);
        fileStream.write(`${bs58.encode(exitWallet.secretKey)}\n`);
        console.log(`Exit wallet ${exitWallet.publicKey.toBase58()} funded with ${transferAmount / BigInt(LAMPORTS_PER_SOL)} SOL`);
      }
    }

    fileStream.end();
    console.log(`Generated ${exitWalletCount} exit wallets dynamically based on ${totalSol} SOL withdrawn`);
    return exitWallets;
  } catch (error) {
    console.error("Error creating exit wallets:", error.message);
    throw error;
  }
};
