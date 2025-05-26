// lib/fetchEmailsFromIMAP.js
import { ImapFlow } from "imapflow";

export async function fetchEmailsViaIMAP({ host, port, user, pass }) {
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993, // IMAPS
    auth: { user, pass },
  });

  await client.connect();
  await client.mailboxOpen("INBOX");

  const messages = [];
  for await (let message of client.fetch("1:10", {
    envelope: true,
    source: true,
    bodyParts: ["text/plain"],
  })) {
    messages.push({
      subject: message.envelope.subject,
      from: message.envelope.from[0].address,
      to: message.envelope.to[0].address,
      date: message.envelope.date,
      body: message.bodyParts?.[0]?.content?.toString("utf8") ?? "",
    });
  }

  await client.logout();
  return messages;
}
