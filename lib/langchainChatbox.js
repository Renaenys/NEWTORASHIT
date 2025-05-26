// lib/langchainChatbox.js
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function sendToLangchain(prompt) {
  const messages = [
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage(prompt),
  ];
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.6,
  });
  const response = await model.call(messages);
  return { response: response.content ?? response };
}
