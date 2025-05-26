// lib/langchainAI.js

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { htmlToText } from "html-to-text";

const MAX_INPUT_LENGTH = 3000;

function simplifyInput(text) {
  if (!text) return "";
  if (text.length <= MAX_INPUT_LENGTH) return text;
  return (
    text.slice(0, MAX_INPUT_LENGTH) +
    "\n\n[Truncated email content due to length]"
  );
}

export const generateEmailReply = async (
  htmlBody, // raw HTML or plaintext
  subject = "(no subject)",
  sender = "the sender",
  langCode = "eng",
  userName = "User",
  userPrompt = ""
) => {
  // 1️⃣ Convert HTML → plain text, then truncate
  const plainText = htmlToText(htmlBody, { wordwrap: false });
  const simplifiedInput = simplifyInput(plainText);

  // 2️⃣ Choose system prompt & signature by language
  let systemPrompt, endingSignature;
  if (langCode === "mal") {
    systemPrompt =
      "Anda adalah pembantu e-mel. Analisis e-mel di bawah dan cadangkan balasan yang jelas dan profesional dalam nada yang sama. Jangan ulangi mesej asal.";
    endingSignature = `\n\nSalam hormat,\n${userName}`;
  } else if (langCode === "chi") {
    systemPrompt =
      "你是邮件助理。请分析下面的邮件内容，并用相同语气提供清晰且专业的回复。不要重复原邮件内容。";
    endingSignature = `\n\n此致，\n${userName}`;
  } else {
    systemPrompt =
      "You are an email assistant. Analyze the email below and suggest a clear, professional reply in the same tone. Do not repeat the original message.";
    endingSignature = `\n\nBest regards,\n${userName}`;
  }

  // 3️⃣ Build the human prompt with sender, subject, content, and user tweaks
  let humanPrompt =
    `You are replying to an email _from_ "${sender}" with _subject_ "${subject}".\n\n` +
    `Email content:\n${simplifiedInput}`;

  if (userPrompt && userPrompt.trim()) {
    humanPrompt += `\n\nUser request to modify the reply:\n${userPrompt.trim()}`;
  }

  humanPrompt += `\n\nPlease end your reply with:${endingSignature}`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt),
  ];

  // 4️⃣ Invoke the model
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.4,
  });

  const response = await model.call(messages);
  return response.content;
};
