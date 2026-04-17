import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, mode, replaceOne, existingQuestions } = await req.json();

    let systemPrompt: string;
    let userPrompt: string;

    if (replaceOne) {
      const ismc = mode === "mc";
      systemPrompt = ismc
        ? `You are a creative ESL teacher designing a multiple choice trivia question. Generate exactly 1 new question that is DIFFERENT from the existing ones. Return valid JSON with this schema: {"text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctLetter":"B","level":"Mid","type":"Definition"}. No markdown.`
        : `You are a creative ESL teacher designing a rapid-fire trivia question. Generate exactly 1 new question that is DIFFERENT from the existing ones. Return valid JSON with this schema: {"text":"...","answer":"...","level":"Mid","type":"Definition"}. No markdown.`;
      userPrompt = `Topic: ${topic}\nLevel: ${level}\nExisting questions (do NOT repeat):\n${(existingQuestions || []).join('\n')}\n\nGenerate 1 replacement question now.`;
      const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });
      return NextResponse.json({ question: parsed });
    }

    if (mode === "mc") {
      systemPrompt = `You are a creative ESL teacher designing a multiple choice trivia game.
Generate 12 engaging questions based on the topic. Each question has 4 answer choices (A, B, C, D) and one correct answer.

Return valid JSON — an array of exactly 12 question objects with this schema:
[
  {
    "text": "What does 'exhausted' mean?",
    "options": { "A": "Very happy", "B": "Very tired", "C": "Very hungry", "D": "Very angry" },
    "correctLetter": "B",
    "level": "Mid",
    "type": "Definition"
  }
]

Valid types: "Definition", "Fill in the blank", "Synonym", "Translation", "Grammar"
Make the distractors plausible but clearly wrong. Match the target class level (${level}). No markdown.`;
      userPrompt = `Topic: ${topic}\nTarget Class Level: ${level}\n\nGenerate the 12 multiple choice questions now!`;
    } else {
      systemPrompt = `You are a creative ESL teacher designing a rapid-fire trivia game.
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
      userPrompt = `Topic: ${topic}\nTarget Class Level: ${level}\n\nGenerate the 15 questions now!`;
    }

    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });

    return NextResponse.json({ questions: parsed });
  } catch (error: any) {
    console.error("Rapid Fire Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
