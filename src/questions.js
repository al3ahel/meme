import prompts from "prompts";

export const askQuestions = async () => {
  return await prompts([
    {
      type: "number",
      name: "coinWalletSol",
      message: "SOL amount for coin wallet:",
      initial: 1,
      validate: (value) => value > 0 ? true : "SOL amount must be positive",
    },
    {
      type: "confirm",
      name: "addLiquidity",
      message: "Add liquidity to a pool?",
      initial: false,
    },
    {
      type: "number",
      name: "liquiditySol",
      message: "Amount of SOL for liquidity:",
      when: (answers) => answers.addLiquidity,
      validate: (value) => value > 0 ? true : "SOL amount must be positive",
    },
    {
      type: "number",
      name: "liquidityTokens",
      message: "Amount of tokens for liquidity:",
      when: (answers) => answers.addLiquidity,
      validate: (value) => value > 0 ? true : "Token amount must be positive",
    },
    {
      type: "confirm",
      name: "useBurners",
      message: "Use burner wallets?",
      initial: true,
    },
    {
      type: "number",
      name: "burnerCount",
      message: "Number of burner wallets (3-5):",
      when: (answers) => answers.useBurners,
      initial: 3,
      validate: (value) => value >= 3 && value <= 5 ? true : "Must be between 3 and 5",
    },
    {
      type: "number",
      name: "burnerSol",
      message: "SOL amount per burner wallet:",
      when: (answers) => answers.useBurners,
      initial: 0.1,
      validate: (value) => value > 0 ? true : "SOL amount must be positive",
    },
    {
      type: "confirm",
      name: "rugPull",
      message: "Include rug pull functionality (experimental)?",
      initial: false,
    },
    {
      type: "number",
      name: "rugPullDelay",
      message: "Initial rug pull delay in seconds (adjusted by profit for non-AI coins):",
      when: (answers) => answers.rugPull,
      initial: 120,
      validate: (value) => value >= 0 ? true : "Delay must be non-negative",
    },
  ]);
};
