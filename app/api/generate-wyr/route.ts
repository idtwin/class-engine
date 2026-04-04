import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher. Generate a list of 10 "Would You Rather" style debate prompts.
Topic: ${topic}
Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "prompts": [
    {
      "optionA": "Short description of choice A",
      "optionB": "Short description of choice B"
    }
  ]
}

Rules:
1. Provide exactly 10 debate scenarios.
2. The choices should be bizarre, funny, or difficult decisions matched to the topic.
3. Keep text for options extremely concise (1-2 sentences max).
4. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nLevel: ${level}\nGenerate JSON now!`;

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, ollamaModel, provider });

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("WYR Gen Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred." }, { status: 500 });
  }
}
