import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher. Generate a 5x5 Jeopardy game board in JSON format.

The JSON MUST be an object with a "board" key containing an array of exactly 5 category objects.
Each category object must have:
- "category": string (max 2 words)
- "questions": array of exactly 5 question objects

Each question object MUST have:
- "points": number (100, 200, 300, 400, 500 sequentially)
- "text": string (the short speaking prompt or question)
- "answer": string (the correct answer or a suggested short answer/hint for the teacher)
- "answered": boolean (MUST be false)
- "includeImage": boolean (MUST be true for AT LEAST HALF of the questions to make the game visually engaging!)
- "imagePrompt": string (If includeImage is true, provide an extremely descriptive 5-8 word visual prompt for an AI image generator. If false, leave empty "")

Return ONLY valid JSON matching this schema exactly. No markdown.`;

    const userPrompt = `Topic: ${topic}\nTarget Class Level: ${level}\n\nGenerate the board JSON now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, ollamaModel, provider });

    // Normalize: generateJSON may auto-unwrap {board:[...]} into [...], or return {board:[...]}
    const board = Array.isArray(parsed) ? parsed : (parsed.board || parsed);
    return NextResponse.json({ board });
  } catch (error: any) {
    console.error("Game Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
