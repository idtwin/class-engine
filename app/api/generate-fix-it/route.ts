import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    let levelPrompt = `Generate EXACTLY 10 questions/sentences matching the ${level} difficulty level.`;
    if (level === "Mixed Level") levelPrompt = `Generate EXACTLY 10 questions/sentences spanning varying difficulties (Low, Mid, and High).`;

    const systemPrompt = `You are a highly creative ESL teacher designing a grammar game called 'Fix It'.
    
Based on the theme/topic, ${levelPrompt}

CRITICAL RULES:
1. Every broken sentence must contain EXACTLY ONE grammatical error. The moment you put two errors in, the game flow is ruined. One error, one fix.
2. The error must logically fall under one of these specific types: Wrong tense, Subject-verb agreement, Missing article, Wrong preposition, Wrong word form, Spelling, Word order, Countable/uncountable, or Collocation.
3. The corrected sentence must perfectly patch only that exact error.

Return valid JSON — an array of exactly 10 objects with this schema:
[
  {
    "level": "Low",
    "errorType": "Wrong preposition",
    "brokenSentence": "We arrived to the airport three hours ago.",
    "correctedSentence": "We arrived at the airport three hours ago.",
    "hint": "Check the preposition attached to the verb 'arrived'."
  }
]`;

    const userPrompt = `Theme/Topic: ${topic}\n\nGenerate the 10 broken sentences now!`;

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.95, ollamaModel, provider });

    return NextResponse.json({ questions: parsed });
  } catch (error: any) {
    console.error("Fix It Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
