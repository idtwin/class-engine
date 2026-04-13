import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher running an improv "Story Chain" game.
Topic: ${topic}
Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "starter": "A wild, mysterious, or funny opening sentence to start the story.",
  "rounds": [
    { "words": ["Noun1", "Noun2", "Noun3"] }
  ]
}

Rules:
1. Provide exactly 15 rounds of words.
2. The "starter" sentence should be crazy and engaging.
3. Each round must contain exactly 3 totally unrelated, highly visual nouns.
4. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nLevel: ${level}\nGenerate JSON now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });

    // Story has multi-key response {starter, rounds} — won't be auto-unwrapped
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Story Gen Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred." }, { status: 500 });
  }
}
