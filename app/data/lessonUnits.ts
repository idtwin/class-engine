export interface LessonStep {
  stepNumber: number;
  phase: "Warm-Up" | "Vocab & Grammar" | "Speaking Challenge" | "Exit Review";
  title: string;
  gameId: string;
  gameName: string;
  icon: string;
  desc: string;
  targetSkill: string;
  promptTopic?: string;
}

export interface WordSpotlight {
  word: string;
  pos: string;
  definition: string;
  example: string;
}

export interface PhraseSpotlight {
  phrase: string;
  meaning: string;
  example: string;
}

export interface LessonUnit {
  id: string;
  grade: "Grade 10" | "Grade 11" | "Grade 12" | "Custom";
  unitTitle: string;
  grammarFocus: string;
  vocabularyTopic: string;
  cefrLevel: "A2" | "B1" | "B2";
  weekNumber?: number; // 1-16
  dayOfWeek?: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  classNotes?: string;
  wordOfTheWeek?: WordSpotlight;
  phraseOfTheWeek?: PhraseSpotlight;
  targetVocabList?: string[];
  agendaNotes?: string[];
  steps: LessonStep[];
}

export const LESSON_UNITS: LessonUnit[] = [
  {
    id: "sma-11-conditionals",
    grade: "Grade 11",
    unitTitle: "Wishes, Regrets & Conditional Sentences",
    grammarFocus: "If Only / I Wish + Past Perfect (Type 2 & 3 Conditionals)",
    vocabularyTopic: "Life Choices, Career Paths & Daily Regrets",
    cefrLevel: "B1",
    weekNumber: 1,
    dayOfWeek: "Mon",
    wordOfTheWeek: {
      word: "Remorse",
      pos: "noun",
      definition: "Deep regret or guilt for a wrong committed in the past.",
      example: "If I had taken that opportunity, I wouldn't feel so much remorse today."
    },
    phraseOfTheWeek: {
      phrase: "Hindsight is 20/20",
      meaning: "It is easy to understand what you should have done after something has already happened.",
      example: "I wish I had studied harder for the exam, but hindsight is 20/20!"
    },
    targetVocabList: ["Remorse", "Hindsight", "Overhaul", "Dilemma", "Pivotal", "Unforeseen"],
    agendaNotes: [
      "Debate hypothetical dilemma scenarios using Type 2 Conditionals",
      "Race to unscramble complex Type 3 conditional sentences",
      "Taboo speaking sprint: describe career regrets without forbidden words",
      "Rapid Fire quiz for final conditional grammar mastery"
    ],
    steps: [
      {
        stepNumber: 1,
        phase: "Warm-Up",
        title: "Dilemma Warm-Up",
        gameId: "wyr",
        gameName: "Would You Rather",
        icon: "💬",
        desc: "Debate bizarre hypothetical scenarios using Type 2 Conditionals.",
        targetSkill: "Speaking Fluency",
        promptTopic: "Hypothetical regrets and career dilemmas (Type 2 Conditionals)"
      },
      {
        stepNumber: 2,
        phase: "Vocab & Grammar",
        title: "Sentence Unscramble Drill",
        gameId: "word-surge",
        gameName: "Word Surge",
        icon: "⚡",
        desc: "Race to unscramble complex conditional sentence structures.",
        targetSkill: "Syntax & Grammar Repair",
        promptTopic: "Type 3 Conditionals (If I had known, I would have...)"
      },
      {
        stepNumber: 3,
        phase: "Speaking Challenge",
        title: "Taboo Vocab Race",
        gameId: "hotseat",
        gameName: "The Hot Seat",
        icon: "🎯",
        desc: "Describe career & regret vocabulary to team members without forbidden words.",
        targetSkill: "Oral Vocabulary Precision",
        promptTopic: "Career choices, regrets, and decision-making vocabulary"
      },
      {
        stepNumber: 4,
        phase: "Exit Review",
        title: "Buzzer Knowledge Check",
        gameId: "rapid-fire",
        gameName: "Rapid Fire",
        icon: "🔥",
        desc: "Rapid 15-question quiz to check conditional grammar mastery before class ends.",
        targetSkill: "Live Assessment",
        promptTopic: "Conditionals, wishes, and regrets grammar review"
      },
    ],
  },
  {
    id: "sma-10-narrative",
    grade: "Grade 10",
    unitTitle: "Narrative Stories & Past Events",
    grammarFocus: "Simple Past vs. Past Continuous (When/While Clauses)",
    vocabularyTopic: "Folktales, Legends & Adventure Vocabulary",
    cefrLevel: "A2",
    weekNumber: 1,
    dayOfWeek: "Tue",
    wordOfTheWeek: {
      word: "Legendary",
      pos: "adjective",
      definition: "Remarkable enough to be famous; described in traditional stories.",
      example: "Malin Kundang is one of the most legendary folktales in West Sumatra."
    },
    phraseOfTheWeek: {
      phrase: "Once upon a time...",
      meaning: "Traditional opening phrase for stories and narrative fables.",
      example: "Once upon a time, a brave warrior defended his village from a giant dragon."
    },
    targetVocabList: ["Legendary", "Enchanted", "Treacherous", "Folkloric", "Vanquish", "Destiny"],
    agendaNotes: [
      "Chain-react past-tense story lines",
      "Auction & fix broken past continuous grammar errors",
      "Classify story action verbs in Odd One Out",
      "Solve picture questions to reveal legendary Indonesian folktale images"
    ],
    steps: [
      {
        stepNumber: 1,
        phase: "Warm-Up",
        title: "Story Starter Chain",
        gameId: "story",
        gameName: "Story Chain",
        icon: "📖",
        desc: "Improvise story sentences using forced past-tense verbs.",
        targetSkill: "Creative Speaking",
        promptTopic: "Folktales and ancient Indonesian legends"
      },
      {
        stepNumber: 2,
        phase: "Vocab & Grammar",
        title: "Error Auction",
        gameId: "fix-it",
        gameName: "Fix It",
        icon: "🟡",
        desc: "Spot and fix past tense errors in broken legend sentences.",
        targetSkill: "Grammar Repair",
        promptTopic: "Past Continuous errors (When vs While clauses)"
      },
      {
        stepNumber: 3,
        phase: "Speaking Challenge",
        title: "Word Outlier Challenge",
        gameId: "odd-one-out",
        gameName: "Odd One Out",
        icon: "🔮",
        desc: "Classify narrative verbs and explain why one doesn't belong.",
        targetSkill: "Analytical Vocabulary",
        promptTopic: "Narrative action verbs and folklore terms"
      },
      {
        stepNumber: 4,
        phase: "Exit Review",
        title: "Picture Reveal",
        gameId: "reveal",
        gameName: "Picture Reveal",
        icon: "🖼️",
        desc: "Answer past-tense questions to reveal historical Indonesian folktale images.",
        targetSkill: "Visual Comprehension",
        promptTopic: "Indonesian folktales and legendary heroes"
      },
    ],
  },
  {
    id: "sma-12-business",
    grade: "Grade 12",
    unitTitle: "Business Proposals & Formal Discussions",
    grammarFocus: "Passive Voice & Modal Verbs of Recommendation",
    vocabularyTopic: "Global Commerce, Technology & Public Speaking",
    cefrLevel: "B2",
    weekNumber: 1,
    dayOfWeek: "Wed",
    wordOfTheWeek: {
      word: "Feasibility",
      pos: "noun",
      definition: "The degree to which a project or proposal can be conveniently achieved.",
      example: "The board conducted a feasibility study before funding the eco-tech startup."
    },
    phraseOfTheWeek: {
      phrase: "Get down to business",
      meaning: "Start focusing on the main work or serious topic at hand.",
      example: "Now that everyone has arrived, let's get down to business and discuss the proposal."
    },
    targetVocabList: ["Feasibility", "Benchmark", "Leverage", "Stakeholder", "Viability", "Synergy"],
    agendaNotes: [
      "Formal Would You Rather debate on tech ethics and startup funding",
      "5x5 Jeopardy matrix covering Passive Voice & Commerce Idioms",
      "Speed collocation chain sprint on formal business vocabulary",
      "Rapid Fire quiz on passive voice constructions"
    ],
    steps: [
      {
        stepNumber: 1,
        phase: "Warm-Up",
        title: "Formal Opinion Debate",
        gameId: "wyr",
        gameName: "Would You Rather",
        icon: "💬",
        desc: "Debate tech ethics and business investment decisions formally.",
        targetSkill: "Formal Speaking",
        promptTopic: "Business ethics and technology investment dilemmas"
      },
      {
        stepNumber: 2,
        phase: "Vocab & Grammar",
        title: "5x5 Business Matrix",
        gameId: "jeopardy",
        gameName: "Jeopardy",
        icon: "⊞",
        desc: "5x5 Category Board covering Business Idioms, Passive Voice, and Tech Terms.",
        targetSkill: "Comprehensive Mastery",
        promptTopic: "Business English, Passive Voice, and Commerce Idioms"
      },
      {
        stepNumber: 3,
        phase: "Speaking Challenge",
        title: "Word Chain Sprint",
        gameId: "chain-reaction",
        gameName: "Chain Reaction",
        icon: "🔗",
        desc: "Build formal compound word chains under time pressure.",
        targetSkill: "Collocation Speed",
        promptTopic: "Business collocations and formal compound words"
      },
      {
        stepNumber: 4,
        phase: "Exit Review",
        title: "Buzzer Master Check",
        gameId: "rapid-fire",
        gameName: "Rapid Fire",
        icon: "🔥",
        desc: "Final 20-question rapid quiz on passive voice constructions.",
        targetSkill: "Final Assessment",
        promptTopic: "Passive voice and modal verbs of recommendation"
      },
    ],
  },
];

const CUSTOM_UNITS_KEY = "class_engine_custom_units_v2";
const CLASS_NOTATIONS_KEY = "class_engine_notations_v1";

export function getCustomUnits(): LessonUnit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_UNITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomUnit(unit: LessonUnit): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCustomUnits();
    const updated = [unit, ...existing.filter(u => u.id !== unit.id)];
    localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom unit:", e);
  }
}

export function deleteCustomUnit(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCustomUnits();
    const updated = existing.filter(u => u.id !== id);
    localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete custom unit:", e);
  }
}

export function getClassNotations(classId: string): Record<string, string> {
  if (typeof window === "undefined" || !classId) return {};
  try {
    const raw = localStorage.getItem(`${CLASS_NOTATIONS_KEY}_${classId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveClassNotation(classId: string, unitId: string, noteText: string): void {
  if (typeof window === "undefined" || !classId) return;
  try {
    const existing = getClassNotations(classId);
    existing[unitId] = noteText;
    localStorage.setItem(`${CLASS_NOTATIONS_KEY}_${classId}`, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to save class notation:", e);
  }
}
