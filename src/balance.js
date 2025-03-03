import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from "./config.js";

const connection = new Connection(config.rpcEndpoint, "confirmed");

export const getBalance = async (publicKey) => {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error fetching balance:", error.message);
    throw error;
  }
};
