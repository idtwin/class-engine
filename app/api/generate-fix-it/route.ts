import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, mode } = await req.json();

    let levelPrompt = `Generate EXACTLY 10 sentences matching the ${level} difficulty level.`;
    if (level === "Mixed Level") levelPrompt = `Generate EXACTLY 10 sentences spanning Low, Mid, and High difficulty levels (mix them).`;

    const systemPrompt = `You are a creative ESL teacher designing a grammar correction game called 'Fix It'.

Each round, students see a sentence with ONE highlighted wrong word and must identify the correct replacement.

${levelPrompt}

CRITICAL RULES:
1. Each sentence must contain EXACTLY ONE wrong word. One word, one fix.
2. The wrong word must logically fall under one of: Wrong tense, Subject-verb agreement, Wrong article, Wrong preposition, Wrong word form, Spelling, Countable/uncountable, or Collocation.
3. The wrongWord must appear EXACTLY ONCE in the sentence so it can be highlighted unambiguously.
4. correctWord is the single word that replaces wrongWord to fix the sentence.
5. options: an array of EXACTLY 4 strings — the correctWord plus 3 plausible distractors. Shuffle them randomly (correctWord must NOT always be first or last).
6. hint: one sentence guiding students toward the grammar concept WITHOUT revealing the answer.

Return valid JSON — an array of exactly 10 objects:
[
  {
    "level": "Low",
    "errorType": "Wrong preposition",
    "sentence": "We arrived to the airport three hours ago.",
    "wrongWord": "to",
    "correctWord": "at",
    "hint": "Think about which preposition follows the verb 'arrive'.",
    "options": ["in", "at", "on", "to"]
  }
]`;

    const userPrompt = `Theme/Topic: ${topic}\nMode: ${mode === "Hard" ? "Hard — students type the answer" : "Easy — multiple choice"}\n\nGenerate the 10 sentences now!`;

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });

    return NextResponse.json({ questions: parsed });
  } catch (error: any) {
    console.error("Fix It Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
