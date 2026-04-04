import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher designing a rapid-fire trivia game.
Generate 15 engaging, fast-paced questions based on the topic.

Return valid JSON — an array of exactly 15 question objects with this schema:
[
  {
    "text": "What does exhausted mean?",
    "answer": "Very tired",
    "level": "Mid",
    "type": "Definition"
  }
]

Valid types: "Definition", "Fill in the blank", "True or false", "Translation", "Category call"
Match the target class level (${level}) in general. No markdown.`;

    const userPrompt = `Topic: ${topic}\nTarget Class Level: ${level}\n\nGenerate the 15 questions now!`;

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, ollamaModel, provider });

    return NextResponse.json({ questions: parsed });
  } catch (error: any) {
    console.error("Rapid Fire Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
