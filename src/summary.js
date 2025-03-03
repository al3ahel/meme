import { Connection } from "@solana/web3.js";
import { burn, getMint } from "@solana/spl-token";
import { config } from "./config.js";

const connection = new Connection(config.rpcEndpoint, "confirmed");

export const displaySummary = (answers, coinName, coinIcon) => {
  console.log("\n=== Token Creation Summary ===");
  console.log(`Token Name: ${coinName}`);
  console.log(`Token Icon: ${coinIcon}`);
  console.log(`Coin Wallet Funding: ${answers.coinWalletSol} SOL`);
  console.log(`Add Liquidity: ${answers.addLiquidity ? `${answers.liquiditySol} SOL + ${answers.liquidityTokens} tokens` : "No"}`);
  console.log(`Burner Wallets: ${answers.useBurners ? `${answers.burnerCount} burners with ${answers.burnerSol} SOL each` : "No"}`);
  console.log(`Rug Pull: ${answers.rugPull ? `Initial delay ${answers.rugPullDelay}s (adjusted by profit for non-AI, lifespan for AI)` : "No"}`);
};

export const burnTokens = async (mint, wallet, tokenAccount, amount) => {
  try {
    const mintInfo = await getMint(connection, mint);
    const adjustedAmount = BigInt(Math.floor(amount * Math.pow(10, mintInfo.decimals)));
    await burn(
      connection,
      wallet,
      tokenAccount,
      mint,
      wallet.publicKey,
      adjustedAmount
    );
    console.log(`Burned ${amount} tokens successfully`);
  } catch (error) {
    console.error("Error burning tokens:", error.message);
    throw error;
  }
};
