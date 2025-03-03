import 'dotenv/config';

const config = {
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY || "",
  rpcEndpoint: process.env.RPC_ENDPOINT || "https://api.devnet.solana.com",
  xApiKey: process.env.X_API_KEY || "",
  huggingFaceToken: process.env.HUGGING_FACE_TOKEN || "",
  redditClientId: process.env.REDDIT_CLIENT_ID || "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET || "",
  pinataApiKey: process.env.PINATA_API_KEY || "", // Add to .env
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY || "", // Add to .env
};

if (!config.walletPrivateKey || !config.xApiKey || !config.huggingFaceToken || !config.redditClientId || !config.redditClientSecret || !config.pinataApiKey || !config.pinataSecretApiKey) {
  console.error("Error: Missing required .env variables");
  process.exit(1);
}

export default config;
