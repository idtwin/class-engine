import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

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
- "imagePrompt": string (If includeImage is true, provide an extremely descriptive 5-8 word visual prompt for an AI image generator, e.g. "A fluffy golden retriever puppy playing in a sunny park". Do NOT use single words. If false, leave empty "")

CRITICAL RULES FOR JSON: 
1. Return ONLY pure raw JSON matching this schema exactly.
2. DO NOT wrap the output in markdown backticks (e.g. \`\`\`json).
3. YOU MUST PROPERLY ESCAPE ANY INNER QUOTES within string values (e.g. "text": "He said \\"Hello\\""). Unescaped quotes will crash the parser.`;

    const userPrompt = `Topic: ${topic}
Target Class Level: ${level}

Generate the board JSON now!`;

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
          temperature: 0.8
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || "Failed to generate game via Gemini" }, { status: response.status });
    }

    let content = data.candidates[0].content.parts[0].text;
    
    // Strip accidental markdown blocks if Gemini still outputs them
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Game Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
