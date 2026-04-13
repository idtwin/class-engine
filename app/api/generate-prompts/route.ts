import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, count } = await req.json();

    const systemPrompt = `You are a creative ESL teacher generating speaking prompts for classroom discussion.

Generate exactly ${count || 6} speaking/discussion prompts related to the given topic.

RULES:
1. Prompts should be engaging, thought-provoking, and encourage conversation
2. Mix types: some opinion-based, some descriptive, some hypothetical, some personal experience
3. Vary difficulty — start easier, get more complex
4. Keep each prompt to 1-2 sentences max
5. Make them fun and interesting for students to discuss

Return ONLY a JSON object with a "prompts" key containing an array of strings:
{"prompts": ["prompt 1", "prompt 2", ...]}

No markdown. No numbering. Just the prompt text.`;

    const userPrompt = `Topic: ${topic}\nNumber of prompts: ${count || 6}\n\nGenerate the prompts now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });

    // Normalize: auto-unwrap may return array directly or {prompts:[...]}
    const prompts = Array.isArray(parsed) ? parsed : (parsed.prompts || parsed);
    return NextResponse.json({ prompts });
  } catch (error: any) {
    console.error("Prompts Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
