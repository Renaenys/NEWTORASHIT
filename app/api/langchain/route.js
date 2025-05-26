// app/api/langchain/route.js
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

// Initialize the client once
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Send local date/time in system message
    const now = new Date();
    const localString = now.toLocaleString();
    const systemContent = `You are a helpful assistant. The user’s local date/time is ${localString}.`;

    // Define available functions
    const functions = [
      {
        name: "create_event",
        description: "Schedule a new calendar event",
        parameters: {
          type: "object",
          required: ["title", "start"],
          properties: {
            title: { type: "string", description: "Event title" },
            start: {
              type: "string",
              format: "date-time",
              description: "ISO datetime for event start (user local)",
            },
          },
        },
      },
      {
        name: "create_meeting",
        description: "Schedule a new meeting",
        parameters: {
          type: "object",
          required: ["title", "date"],
          properties: {
            title: { type: "string", description: "Meeting title" },
            date: {
              type: "string",
              format: "date-time",
              description: "ISO datetime for meeting (user local)",
            },
          },
        },
      },
      {
        name: "create_task",
        description: "Create a new to-do task",
        parameters: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string", description: "Task description" },
          },
        },
      },
      {
        name: "create_contact",
        description: "Add a new contact",
        parameters: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", description: "Contact name" },
            email: {
              type: "string",
              format: "email",
              description: "Contact email",
            },
            phone: {
              type: "string",
              description: "Contact phone number",
            },
          },
        },
      },
    ];

    // Call the model
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      functions,
      function_call: "auto",
      temperature: 0.3,
    });

    const msg = chat.choices[0].message;

    // If a function call was chosen, return its name and parsed args
    if (msg.function_call) {
      return NextResponse.json({
        action: msg.function_call.name,
        params: JSON.parse(msg.function_call.arguments),
      });
    }

    // Otherwise return plain text
    return NextResponse.json({ response: msg.content });
  } catch (err) {
    console.error("⚠️ /api/langchain error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
