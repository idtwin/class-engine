import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level = "Grade 11", provider = "gemini" } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert English Language Teacher creating a "Word Surge" sentence scramble game for Indonesian Senior High School (SMA) students at level ${level}.
Target Topic / Theme: "${topic}"

Generate 5 high-quality English sentences related to the topic. For each sentence, provide:
1. "original": The full, correct English sentence.
2. "scrambled": An array of words representing the scrambled sentence (all lowercase or natural casing).
3. "hint": A brief grammar/vocabulary hint explaining the structure or key verb.
4. "translation_id": Indonesian translation of the sentence.

Return ONLY a JSON object with a single "prompts" array containing 5 objects.
Example output format:
{
  "prompts": [
    {
      "original": "Solar energy powers sustainable cities across the world.",
      "scrambled": ["powers", "energy", "across", "cities", "Solar", "sustainable", "world.", "the"],
      "hint": "Subject (Solar energy) + Active Verb (powers) + Direct Object + Prepositional Phrase.",
      "translation_id": "Energi surya memfasilitasi kota-kota berkelanjutan di seluruh dunia."
    }
  ]
}`;

    // Fallback static prompts if no key or offline
    const fallbackPrompts = [
      {
        original: "Students must present their analytical exposition clearly.",
        scrambled: ["must", "analytical", "exposition", "Students", "their", "clearly.", "present"],
        hint: "Modal Verb (must) + Base Verb (present) + Noun Phrase.",
        translation_id: "Siswa harus mempresentasikan eksposisi analitis mereka dengan jelas."
      },
      {
        original: "Renewable power reduces carbon emissions significantly.",
        scrambled: ["carbon", "reduces", "Renewable", "significantly.", "power", "emissions"],
        hint: "Active Present Tense + Adverb of Manner (significantly).",
        translation_id: "Energi terbarukan mengurangi emisi karbon secara signifikan."
      },
      {
        original: "The teacher assigned a recount text essay.",
        scrambled: ["assigned", "recount", "The", "teacher", "essay.", "text", "a"],
        hint: "Simple Past Tense (assigned).",
        translation_id: "Guru memberikan tugas esai teks rekon."
      },
      {
        original: "Clean water remains essential for human survival.",
        scrambled: ["water", "remains", "essential", "Clean", "survival.", "human", "for"],
        hint: "Linking Verb (remains) + Predicate Adjective (essential).",
        translation_id: "Air bersih tetap sangat penting untuk kelangsungan hidup manusia."
      },
      {
        original: "Digital technology transforms modern classroom learning.",
        scrambled: ["transforms", "technology", "Digital", "classroom", "learning.", "modern"],
        hint: "Singular Subject + Verb -s + Compound Noun.",
        translation_id: "Teknologi digital mentransformasi pembelajaran kelas modern."
      }
    ];

    const activeApiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GROQ_API_KEY;

    if (!activeApiKey) {
      return NextResponse.json({ prompts: fallbackPrompts });
    }

    try {
      if (provider === "groq") {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }],
            response_format: { type: "json_object" }
          })
        });
        const groqData = await groqRes.json();
        const parsed = JSON.parse(groqData.choices[0].message.content);
        return NextResponse.json({ prompts: parsed.prompts || fallbackPrompts });
      } else {
        // Default to Gemini
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );
        const geminiData = await geminiRes.json();
        const text = geminiData.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        return NextResponse.json({ prompts: parsed.prompts || fallbackPrompts });
      }
    } catch (apiErr) {
      console.warn("[WORD_SURGE_AI] Falling back to default prompts:", apiErr);
      return NextResponse.json({ prompts: fallbackPrompts });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate Word Surge prompts" }, { status: 500 });
  }
}
