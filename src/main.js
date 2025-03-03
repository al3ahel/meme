import { createKeypair, createCoinWallet, createBurnerWallets, createBotWallets } from "./keypair.js";
import { getBalance } from "./balance.js";
import { displayWelcomeScreen } from "./welcomeScreen.js";
import { askQuestions } from "./questions.js";
import { confirmCreation } from "./confirmation.js";
import { displaySummary } from "./summary.js";
import { createToken, addLiquidity, rugPull } from "./tokenCreation.js";
import fetch from "node-fetch";
import { pipeline } from "@huggingface/transformers";
import { createClient } from "praw-reddit";

const { config } = await import("./config.js");

const sentimentAnalyzer = await pipeline("sentiment-analysis", "distilbert-base-uncased-finetuned-sst-2-english");

async function monitorSocialMedia() {
  const xHeaders = { "Authorization": `Bearer ${config.xApiKey}` };
  const redditClient = new createClient({
    clientId: config.redditClientId,
    clientSecret: config.redditClientSecret,
    userAgent: "MemeCoinCreator/1.0",
  });

  while (true) {
    const xResponse = await fetch("https://api.twitter.com/2/users/44196397/tweets?max_results=5", { headers: xHeaders });
    const xTweets = await xResponse.json();
    for (const tweet of xTweets.data || []) {
      const sentiment = await sentimentAnalyzer(tweet.text);
      const likes = tweet.public_metrics?.like_count || 0;
      if (sentiment[0].label === "POSITIVE" && sentiment[0].score > 0.7 && likes > 100) {
        const coinMatch = tweet.text.match(/[A-Za-z]+Coin\b/i);
        if (coinMatch) {
          const coinName = coinMatch[0];
          const imageResponse = await fetch("https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5", {
            method: "POST",
            headers: { "Authorization": `Bearer ${config.huggingFaceToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: coinName }),
          });
          const imageBlob = await imageResponse.blob();
          const imageUrl = await uploadToPinata(imageBlob, coinName);
          return { coinName, coinIconUri: imageUrl, isAiTriggered: true };
        }
      }
    }

    const redditPosts = await redditClient.getSubreddit("CryptoCurrency").getHot({ limit: 5 });
    for (const post of redditPosts) {
      const sentiment = await sentimentAnalyzer(post.title);
      if (sentiment[0].label === "POSITIVE" && sentiment[0].score > 0.7 && post.ups > 50) {
        const coinMatch = post.title.match(/[A-Za-z]+Coin\b/i);
        if (coinMatch) {
          const coinName = coinMatch[0];
          const imageResponse = await fetch("https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5", {
            method: "POST",
            headers: { "Authorization": `Bearer ${config.huggingFaceToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: coinName }),
          });
          const imageBlob = await imageResponse.blob();
          const imageUrl = await uploadToPinata(imageBlob, coinName);
          return { coinName, coinIconUri: imageUrl, isAiTriggered: true };
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
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

export const main = async () => {
  try {
    const phantomWallet = createKeypair();
    const balance = await getBalance(phantomWallet.publicKey);
    console.log(`Phantom Wallet: ${phantomWallet.publicKey.toString()}`);
    console.log(`Balance: ${balance} SOL`);

    displayWelcomeScreen();
    const answers = await askQuestions();

    const coinWallet = await createCoinWallet(phantomWallet, answers.coinWalletSol);
    let burners = [];
    if (answers.useBurners) {
      burners = await createBurnerWallets(answers.burnerCount, phantomWallet, answers.burnerSol);
      burners.forEach((burner, index) => {
        console.log(`Burner Wallet ${index + 1}: ${burner.publicKey.toBase58()}`);
      });
    }
    const bots = await createBotWallets(phantomWallet);

    let coinName, coinIconUri, isAiTriggered = false;
    if (answers.rugPull) {
      console.log("Monitoring X and Reddit for hype...");
      const { coinName: aiCoinName, coinIconUri: aiCoinIconUri, isAiTriggered: aiFlag } = await monitorSocialMedia();
      coinName = aiCoinName;
      coinIconUri = aiCoinIconUri;
      isAiTriggered = aiFlag;
    } else {
      coinName = "ManualCoin";
      coinIconUri = "https://example.com/manualcoin.png";
    }

    if (await confirmCreation(answers)) {
      displaySummary(answers, coinName, coinIconUri);

      const { mint, tokenAccounts, poolKeys } = await createToken(answers, phantomWallet, coinWallet, burners, coinName, coinIconUri);

      if (answers.rugPull) {
        console.warn(`Rug pull scheduled with ${isAiTriggered ? "AI lifespan" : "profit-based delay up to 4 hours"}...`);
        setTimeout(() => rugPull(phantomWallet, coinWallet, burners, bots, poolKeys, answers.liquiditySol, isAiTriggered), answers.rugPullDelay * 1000);
      }

      console.log("Token creation process initiated! Post on X/Reddit manually to boost hype.");
    } else {
      console.log("Token creation cancelled.");
    }
  } catch (error) {
    console.error("Main execution failed:", error.message);
    process.exit(1);
  }
};

main();
