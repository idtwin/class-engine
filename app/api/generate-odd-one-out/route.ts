import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    let levelPrompt = `Generate EXACTLY 12 sets matching the ${level} difficulty level.`;
    if (level === "Mixed Level") levelPrompt = `Generate EXACTLY 12 sets: 4 Low difficulty, 4 Mid difficulty, 4 High difficulty.`;

    const systemPrompt = `You are a creative ESL teacher designing an 'Odd One Out' vocabulary game.

Based on the topic, ${levelPrompt}
Each set contains exactly 4 words where 3 belong to a pattern and 1 is the odd one out.

Return valid JSON — an array of exactly 12 objects with this schema:
[
  {
    "level": "Low",
    "words": ["Word1", "Word2", "Word3", "Word4"],
    "answer": "The odd one out word (must match exactly one item in words array)",
    "hint": "A helpful clue explaining what the 3 similar words have in common."
  }
]

Make sure "words" has EXACTLY 4 strings. No markdown.`;

    const userPrompt = `Topic: ${topic}\n\nGenerate the 12 sets now!`;

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, ollamaModel, provider });

    return NextResponse.json({ questions: parsed });
  } catch (error: any) {
    console.error("Odd One Out Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
