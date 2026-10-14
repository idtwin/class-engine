import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

const FALLBACK_THEME_DECKS: Record<string, { word: string; forbidden: string[] }[]> = {
  animals: [
    { word: "Lion", forbidden: ["Mane", "Roar", "Cat", "King"] },
    { word: "Elephant", forbidden: ["Trunk", "Tusk", "Big", "Africa"] },
    { word: "Penguin", forbidden: ["Antarctica", "Bird", "Ice", "Swim"] },
    { word: "Kangaroo", forbidden: ["Australia", "Jump", "Pouch", "Hop"] },
    { word: "Dolphin", forbidden: ["Ocean", "Swim", "Smart", "Whale"] },
    { word: "Giraffe", forbidden: ["Neck", "Tall", "Spots", "Leaves"] },
    { word: "Cheetah", forbidden: ["Fast", "Spots", "Run", "Cat"] },
    { word: "Owl", forbidden: ["Night", "Bird", "Eyes", "Hoot"] },
    { word: "Octopus", forbidden: ["Tentacles", "Eight", "Ocean", "Ink"] },
    { word: "Rabbit", forbidden: ["Carrot", "Ears", "Hop", "Fluffy"] },
  ],
  food: [
    { word: "Pizza", forbidden: ["Cheese", "Crust", "Italy", "Slice"] },
    { word: "Sushi", forbidden: ["Rice", "Fish", "Japan", "Roll"] },
    { word: "Hamburger", forbidden: ["Bun", "Beef", "Fast Food", "Patty"] },
    { word: "Ice Cream", forbidden: ["Cold", "Sweet", "Cone", "Dairy"] },
    { word: "Spaghetti", forbidden: ["Pasta", "Noodles", "Sauce", "Italy"] },
    { word: "Pancake", forbidden: ["Syrup", "Breakfast", "Flat", "Batter"] },
    { word: "Chocolate", forbidden: ["Sweet", "Candy", "Cocoa", "Brown"] },
    { word: "Taco", forbidden: ["Mexico", "Shell", "Meat", "Salsa"] },
    { word: "Popcorn", forbidden: ["Movie", "Butter", "Corn", "Kernel"] },
    { word: "Salad", forbidden: ["Lettuce", "Vegetable", "Dressing", "Bowl"] },
  ],
  travel: [
    { word: "Airplane", forbidden: ["Fly", "Airport", "Wings", "Pilot"] },
    { word: "Passport", forbidden: ["Travel", "Country", "Border", "ID"] },
    { word: "Hotel", forbidden: ["Room", "Sleep", "Stay", "Vacation"] },
    { word: "Suitcase", forbidden: ["Luggage", "Pack", "Clothes", "Bag"] },
    { word: "Beach", forbidden: ["Sand", "Ocean", "Sun", "Waves"] },
    { word: "Mountain", forbidden: ["Climb", "High", "Peak", "Hike"] },
    { word: "Train", forbidden: ["Track", "Station", "Ride", "Locomotive"] },
    { word: "Cruise", forbidden: ["Ship", "Boat", "Ocean", "Vacation"] },
    { word: "Museum", forbidden: ["Art", "History", "Exhibit", "Building"] },
    { word: "Map", forbidden: ["Directions", "GPS", "Lost", "Road"] },
  ],
  jobs: [
    { word: "Doctor", forbidden: ["Hospital", "Sick", "Medicine", "Nurse"] },
    { word: "Teacher", forbidden: ["School", "Class", "Student", "Homework"] },
    { word: "Firefighter", forbidden: ["Fire", "Hose", "Truck", "Extinguish"] },
    { word: "Pilot", forbidden: ["Fly", "Airplane", "Sky", "Cockpit"] },
    { word: "Chef", forbidden: ["Cook", "Kitchen", "Restaurant", "Food"] },
    { word: "Police Officer", forbidden: ["Badge", "Law", "Arrest", "Uniform"] },
    { word: "Astronaut", forbidden: ["Space", "Moon", "Rocket", "NASA"] },
    { word: "Artist", forbidden: ["Paint", "Draw", "Creative", "Canvas"] },
    { word: "Musician", forbidden: ["Sing", "Instrument", "Song", "Play"] },
    { word: "Farmer", forbidden: ["Crops", "Barn", "Tractor", "Animals"] },
  ],
  sports: [
    { word: "Soccer", forbidden: ["Ball", "Goal", "Kick", "World Cup"] },
    { word: "Basketball", forbidden: ["Hoop", "Dunk", "Court", "Bounce"] },
    { word: "Tennis", forbidden: ["Racket", "Court", "Net", "Ball"] },
    { word: "Swimming", forbidden: ["Pool", "Water", "Goggles", "Stroke"] },
    { word: "Baseball", forbidden: ["Bat", "Glove", "Pitch", "Base"] },
    { word: "Volleyball", forbidden: ["Spike", "Net", "Sand", "Beach"] },
    { word: "Cycling", forbidden: ["Bicycle", "Ride", "Pedal", "Helmet"] },
    { word: "Boxing", forbidden: ["Gloves", "Ring", "Punch", "Fight"] },
    { word: "Skiing", forbidden: ["Snow", "Mountain", "Poles", "Winter"] },
    { word: "Golf", forbidden: ["Club", "Hole", "Grass", "Swing"] },
  ],
  tech: [
    { word: "Smartphone", forbidden: ["Screen", "Call", "Apple", "Device"] },
    { word: "Laptop", forbidden: ["Computer", "Keyboard", "Screen", "Work"] },
    { word: "Internet", forbidden: ["Web", "Online", "Wifi", "Browse"] },
    { word: "Headphones", forbidden: ["Music", "Ears", "Listen", "Audio"] },
    { word: "Camera", forbidden: ["Photo", "Picture", "Flash", "Lens"] },
    { word: "Robot", forbidden: ["Machine", "AI", "Metal", "Future"] },
    { word: "Video Game", forbidden: ["Play", "Console", "Controller", "Screen"] },
    { word: "Smartwatch", forbidden: ["Wrist", "Time", "Steps", "Apple"] },
    { word: "Drone", forbidden: ["Fly", "Remote", "Camera", "Propeller"] },
    { word: "Tablet", forbidden: ["iPad", "Screen", "Touch", "App"] },
  ],
  movies: [
    { word: "Popcorn", forbidden: ["Cinema", "Butter", "Corn", "Snack"] },
    { word: "Director", forbidden: ["Action", "Cut", "Film", "Megaphone"] },
    { word: "Actor", forbidden: ["Movie", "Star", "Role", "Perform"] },
    { word: "Oscar", forbidden: ["Award", "Trophy", "Gold", "Statue"] },
    { word: "Ticket", forbidden: ["Cinema", "Entry", "Paper", "Seat"] },
    { word: "Superhero", forbidden: ["Marvel", "Power", "Cape", "Hero"] },
    { word: "Cinema", forbidden: ["Theater", "Big Screen", "Popcorn", "Seats"] },
    { word: "Animation", forbidden: ["Cartoon", "Disney", "Pixar", "Draw"] },
    { word: "Horror", forbidden: ["Scary", "Ghost", "Fear", "Monster"] },
    { word: "Script", forbidden: ["Lines", "Writer", "Words", "Read"] },
  ],
  school: [
    { word: "Homework", forbidden: ["Study", "Home", "Teacher", "Assignment"] },
    { word: "Backpack", forbidden: ["Bag", "Books", "Carry", "School"] },
    { word: "Library", forbidden: ["Books", "Quiet", "Read", "Borrow"] },
    { word: "Calculator", forbidden: ["Math", "Numbers", "Buttons", "Solve"] },
    { word: "Blackboard", forbidden: ["Chalk", "Write", "Teacher", "Wall"] },
    { word: "Exam", forbidden: ["Test", "Grade", "Score", "Pass"] },
    { word: "Pencil", forbidden: ["Write", "Lead", "Eraser", "Sharpener"] },
    { word: "Classroom", forbidden: ["Desk", "Students", "Teacher", "Room"] },
    { word: "Recess", forbidden: ["Play", "Break", "Outside", "Bell"] },
    { word: "Ruler", forbidden: ["Measure", "Straight", "Length", "Centimeter"] },
  ],
  space: [
    { word: "Rocket", forbidden: ["Launch", "Space", "Fuel", "Moon"] },
    { word: "Astronaut", forbidden: ["Suit", "Space", "NASA", "Moon"] },
    { word: "Telescope", forbidden: ["Look", "Stars", "Sky", "Lens"] },
    { word: "Moon", forbidden: ["Night", "Orbit", "Crater", "Sky"] },
    { word: "Mars", forbidden: ["Red", "Planet", "Rover", "Alien"] },
    { word: "Alien", forbidden: ["UFO", "Extraterrestrial", "Space", "Green"] },
    { word: "Black Hole", forbidden: ["Gravity", "Light", "Dark", "Space"] },
    { word: "Satellite", forbidden: ["Orbit", "Signal", "Space", "Earth"] },
    { word: "Solar System", forbidden: ["Sun", "Planets", "Eight", "Orbit"] },
    { word: "Comet", forbidden: ["Tail", "Ice", "Space", "Fly"] },
  ],
  music: [
    { word: "Guitar", forbidden: ["Strings", "Instrument", "Rock", "Strum"] },
    { word: "Drums", forbidden: ["Beat", "Sticks", "Loud", "Rhythm"] },
    { word: "Microphone", forbidden: ["Sing", "Voice", "Loud", "Stage"] },
    { word: "Concert", forbidden: ["Show", "Crowd", "Live", "Band"] },
    { word: "Piano", forbidden: ["Keys", "Black", "White", "Classical"] },
    { word: "Headphones", forbidden: ["Ears", "Listen", "Audio", "Music"] },
    { word: "Song", forbidden: ["Sing", "Lyrics", "Melody", "Track"] },
    { word: "Singer", forbidden: ["Voice", "Performer", "Pop", "Famous"] },
    { word: "Album", forbidden: ["Songs", "Record", "Tracks", "Artist"] },
    { word: "DJ", forbidden: ["Party", "Mix", "Turntable", "Beats"] },
  ],
};

function getFallbackDeck(topic: string) {
  const t = topic.toLowerCase();
  if (/movie|film|cinema|hollywood|actor|director/.test(t)) return FALLBACK_THEME_DECKS.movies;
  if (/school|class|study|student|education|teacher|exam/.test(t)) return FALLBACK_THEME_DECKS.school;
  if (/space|astro|planet|star|universe|galaxy|moon|rocket/.test(t)) return FALLBACK_THEME_DECKS.space;
  if (/tech|comput|phone|digital|internet|smart|device/.test(t)) return FALLBACK_THEME_DECKS.tech;
  if (/sport|game|play|athlete|ball|soccer|tennis|basket/.test(t)) return FALLBACK_THEME_DECKS.sports;
  if (/job|work|career|profession|office|doctor/.test(t)) return FALLBACK_THEME_DECKS.jobs;
  if (/travel|trip|vacation|holiday|flight|beach|hotel/.test(t)) return FALLBACK_THEME_DECKS.travel;
  if (/food|cook|eat|kitchen|dinner|restaurant|pizza/.test(t)) return FALLBACK_THEME_DECKS.food;
  if (/animal|pet|zoo|nature|wild|creature/.test(t)) return FALLBACK_THEME_DECKS.animals;
  if (/music|song|instrument|band|sing|dance/.test(t)) return FALLBACK_THEME_DECKS.music;

  for (const [key, deck] of Object.entries(FALLBACK_THEME_DECKS)) {
    if (t.includes(key) || key.includes(t)) {
      return deck;
    }
  }
  return FALLBACK_THEME_DECKS.food;
}

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, showTranslations, seed, exclude } = await req.json();

    const translationInstruction = showTranslations 
      ? `Provide an Indonesian translation in parenthesis for the main "word" and each "forbidden" word. Example: "ELEPHANT (Gajah)".` 
      : `Return the words in English ONLY.`;

    const exclusionList = (exclude && exclude.length > 0) 
      ? `STRICT EXCLUSION: Do NOT use any of these words: ${exclude.join(", ")}.`
      : "";

    const systemPrompt = `You are a fun, high-energy ESL game show host. Generate a list of 10 Password/Taboo words for a speaking game.
Topic: ${topic || "General Vocabulary"}
Target Class Level: ${level || "Intermediate"}

Return ONLY raw JSON in this exact structure:
{
  "words": [
    {
      "word": "ELEPHANT",
      "forbidden": ["TRUNK", "ANIMAL", "BIG"]
    }
  ]
}

Rules:
1. Provide exactly 10 words.
2. Provide exactly 3 or 4 forbidden words.
3. ${translationInstruction}
4. ${exclusionList}
5. PEDAGOGICAL BALANCING:
   - Simple, touchable everyday objects and clear concepts.
   - Absolutely NO obscure scientific jargon or ultra-rare academic terms.
6. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic || "General"}\nLevel: ${level || "Intermediate"}\nSeed: ${seed || Math.random()}\nGenerate JSON now!`;

    try {
      const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, mistralModel, provider });

      // Normalize: auto-unwrap may return array directly or {words:[...]}
      let words = Array.isArray(parsed) ? parsed : (parsed?.words || parsed);
      if (Array.isArray(words) && words.length > 0) {
        return NextResponse.json({ words });
      }
    } catch (llmErr) {
      console.warn("[HotSeat Gen] LLM call failed, employing curated deck fallback:", llmErr);
    }

    // Curated fallback deck ensures zero classroom interruptions
    const fallback = getFallbackDeck(topic || "general");
    return NextResponse.json({ words: fallback });
  } catch (error: any) {
    console.error("HotSeat Gen Fatal Error:", error);
    // Even in worst case, return fallback deck
    return NextResponse.json({ words: FALLBACK_THEME_DECKS.animals });
  }
}
