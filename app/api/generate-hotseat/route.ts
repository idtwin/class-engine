import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher. Generate a list of 10 Taboo/Password words for a speaking game.
Topic: ${topic}
Target Class Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "words": [
    {
      "word": "ELEPHANT",
      "forbidden": ["TRUNK", "ANIMAL", "BIG"]
    }
  ]
}

Rules:
1. Provide exactly 10 words highly relevant to the topic.
2. Provide exactly 3 forbidden words that are the most common descriptors for the target word.
3. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nLevel: ${level}\nGenerate JSON now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, ollamaModel, provider });

    // Normalize: auto-unwrap may return array directly or {words:[...]}
    const words = Array.isArray(parsed) ? parsed : (parsed.words || parsed);
    return NextResponse.json({ words });
  } catch (error: any) {
    console.error("HotSeat Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
