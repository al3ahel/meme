import prompts from "prompts";

export const confirmCreation = async (answers) => {
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Confirm token creation with these settings?",
    initial: true,
  });
  return response.confirm;
};
