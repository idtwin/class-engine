import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const systemPrompt = `You are a creative ESL teacher designing a rapid-fire trivia game.
Generate 15 engaging, fast-paced questions based on the topic.

The JSON MUST be exactly an array of 15 question objects matching this schema:
[
  {
    "text": "The actual question or prompt (e.g., 'What does exhausted mean?' or 'She ___ to school yesterday.')",
    "answer": "The target answer",
    "level": "Low" | "Mid" | "High",
    "type": "Definition" | "Fill in the blank" | "True or false" | "Translation" | "Category call"
  }
]

Requirements for questions:
- Match the target class level (${level}) in general, but ensure the "level" property of the output objects is correctly assessed for each individual question (some may be slightly lower, some higher, but average around ${level}).
- Output only valid internal JSON.
- CRITICAL: Return ONLY pure raw JSON starting with [ and ending with ]. DO NOT wrap in markdown \`\`\`json blocks.
- CRITICAL: PROPERLY ESCAPE ANY INNER QUOTES.`;

    const userPrompt = `Topic: ${topic}
Target Class Level: ${level}

Generate the 15 questions now!`;

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
          temperature: 0.9
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || "Failed to generate game via Gemini" }, { status: response.status });
    }

    let content = data.candidates[0].content.parts[0].text;
    
    // Strip accidental markdown blocks
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    const parsed = JSON.parse(content);

    return NextResponse.json({ questions: parsed });

  } catch (error: any) {
    console.error("Rapid Fire Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
