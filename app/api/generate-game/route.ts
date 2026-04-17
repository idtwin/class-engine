import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, replaceOne, category, points } = await req.json();

    if (replaceOne) {
      const sysPrompt = `You are a Jeopardy question writer for ESL students. Generate exactly 1 replacement question for the "${category}" category worth ${points} points. Return valid JSON: {"text":"specific clue with one answer","answer":"short answer","includeImage":false,"imagePrompt":""}. No markdown.`;
      const usrPrompt = `Topic: ${topic}\nCategory: ${category}\nPoints: ${points}\n\nGenerate 1 specific Jeopardy clue with a single unambiguous answer now.`;
      const parsed: any = await generateJSON(apiKey, { systemPrompt: sysPrompt, userPrompt: usrPrompt, temperature: 0.8, mistralModel, provider });
      return NextResponse.json({ question: parsed });
    }


    const systemPrompt = `You are a master quiz writer creating a Jeopardy board for ESL students. Generate a 5x5 Jeopardy game board.

CRITICAL RULES FOR QUESTIONS:
- Every question MUST have exactly ONE correct, unambiguous answer
- NEVER write vague questions like "Active volcano in Indonesia" (there are many!) — instead write "This Indonesian volcano erupted in 1883, causing a global temperature drop" (Answer: Krakatoa)
- Questions should be phrased as specific clues with enough detail to narrow to a single answer
- Use proper Jeopardy-style phrasing: "This [specific detail]..." or "Named after [detail], this..."
- Higher point values (400-500) should be harder and more detailed, lower values (100-200) should be easier but still specific
- Mix question types: factual recall, "fill in the blank", definitions, who/what/where with context

The JSON MUST be an object with a "board" key containing an array of exactly 5 category objects.
Each category object must have:
- "category": string (2-3 words, creative and engaging)
- "questions": array of exactly 5 question objects

Each question object MUST have:
- "points": number (100, 200, 300, 400, 500 sequentially)
- "text": string (a detailed, specific clue with only one possible answer)
- "answer": string (the single correct answer, 1-4 words)
- "answered": boolean (MUST be false)
- "includeImage": boolean (true for AT LEAST HALF of the questions)
- "imagePrompt": string (If includeImage is true, descriptive 5-8 word visual prompt. If false, empty "")

Return ONLY valid JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nTarget Class Level: ${level}\n\nGenerate the board now. Remember: every question must have exactly ONE specific answer. No vague or ambiguous clues!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.7, mistralModel, provider });

    // Normalize: generateJSON may auto-unwrap {board:[...]} into [...], or return {board:[...]}
    const board = Array.isArray(parsed) ? parsed : (parsed.board || parsed);
    return NextResponse.json({ board });
  } catch (error: any) {
    console.error("Game Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
