import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    let levelPrompt = `Generate EXACTLY 10 questions/sentences matching the ${level} difficulty level.`;
    if (level === "Mixed Level") levelPrompt = `Generate EXACTLY 10 questions/sentences spanning varying difficulties (Low, Mid, and High).`;

    const systemPrompt = `You are a highly creative ESL teacher designing a grammar game called 'Fix It'.
    
Based on the theme/topic, ${levelPrompt}

CRITICAL RULES:
1. Every broken sentence must contain EXACTLY ONE grammatical error. The moment you put two errors in, the game flow is ruined. One error, one fix.
2. The error must logically fall under one of these specific types: Wrong tense, Subject-verb agreement, Missing article, Wrong preposition, Wrong word form, Spelling, Word order, Countable/uncountable, or Collocation.
3. The corrected sentence must perfectly patch only that exact error.

The JSON MUST be exactly an array of 10 objects matching this precise schema:
[
  {
    "level": "Low" | "Mid" | "High",
    "errorType": "Wrong preposition 🚨",
    "brokenSentence": "We arrived to the airport three hours ago.",
    "correctedSentence": "We arrived AT the airport three hours ago.",
    "hint": "Check the preposition attached to the verb 'arrived'."
  }
]

Requirements:
- Output only valid internal JSON.
- CRITICAL: Return ONLY pure raw JSON starting with [ and ending with ]. DO NOT wrap in markdown \`\`\`json blocks.
- CRITICAL: PROPERLY ESCAPE ANY INNER QUOTES.`;

    const userPrompt = `Theme/Topic: ${topic}

Generate the 10 broken sentences now!`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: "user",
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.95
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || "Failed to generate game via Gemini" }, { status: response.status });
    }

    let content = data.candidates[0].content.parts[0].text;
    
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    const parsed = JSON.parse(content);

    return NextResponse.json({ questions: parsed });

  } catch (error: any) {
    console.error("Fix It Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
