import { mintTo } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config.js";

const connection = new Connection(config.rpcEndpoint, "confirmed");

export const distributeVestedTokens = async (mint, wallet, beneficiaries, totalTokens, timePeriods) => {
  try {
    const mintInfo = await getMint(connection, mint);
    const tokensPerPeriod = totalTokens / timePeriods;
    for (let j = 0; j < timePeriods; j++) {
      const operations = beneficiaries.map((beneficiary) => {
        const beneficiaryAccount = beneficiary.account instanceof PublicKey ? beneficiary.account : new PublicKey(beneficiary.account);
        return mintTo(
          connection,
          wallet,
          mint,
          beneficiaryAccount,
          wallet.publicKey,
          BigInt(Math.floor(tokensPerPeriod * Math.pow(10, mintInfo.decimals)))
        );
      });
      await Promise.all(operations);
      console.log(`Tokens distributed for period ${j + 1}/${timePeriods}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log("Vested token distribution completed");
  } catch (error) {
    console.error("Error during vested token distribution:", error.message);
    throw error;
  }
};

export const releaseTokenBatches = async (mint, wallet, recipients, totalAmount, releaseCycles) => {
  try {
    const mintInfo = await getMint(connection, mint);
    const batchSize = totalAmount / releaseCycles;
    for (let k = 0; k < releaseCycles; k++) {
      const batchTransfers = recipients.map((recipient) => {
        const recipientAccount = recipient.account instanceof PublicKey ? recipient.account : new PublicKey(recipient.account);
        return mintTo(
          connection,
          wallet,
          mint,
          recipientAccount,
          wallet.publicKey,
          BigInt(Math.floor(batchSize * Math.pow(10, mintInfo.decimals)))
        );
      });
      await Promise.all(batchTransfers);
      console.log(`Released token batch ${k + 1}/${releaseCycles}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log("All token batches released");
  } catch (error) {
    console.error("Error during token batch release:", error.message);
    throw error;
  }
};
