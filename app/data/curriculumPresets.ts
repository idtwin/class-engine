export interface LessonPreset {
  id: string;
  grade: "Grade 10" | "Grade 11" | "Grade 12";
  topic: string;
  title: string;
  category: "Grammar" | "Vocabulary" | "Writing" | "UTBK Prep";
  description: string;
}

export const SMA_CURRICULUM_PRESETS: LessonPreset[] = [
  // Grade 10
  {
    id: "g10-descriptive",
    grade: "Grade 10",
    topic: "Descriptive Text — Famous Places & Historical Buildings",
    title: "Descriptive Text: Places",
    category: "Vocabulary",
    description: "Adjectives of place, sensory details, and present tense descriptions (Borobudur, Komodo Island)."
  },
  {
    id: "g10-recount",
    grade: "Grade 10",
    topic: "Recount Text — Personal Experience & Historical Events",
    title: "Recount Text: Chronology",
    category: "Grammar",
    description: "Simple past tense verbs, time connectives (first, then, after that), and personal reflections."
  },
  {
    id: "g10-congratulations",
    grade: "Grade 10",
    topic: "Expressing Congratulations & Compliments",
    title: "Social Expressions: Compliments",
    category: "Writing",
    description: "Phrases for celebrating achievements, academic honors, and sports victories."
  },

  // Grade 11
  {
    id: "g11-analytical",
    grade: "Grade 11",
    topic: "Analytical Exposition — Social & Environmental Issues",
    title: "Analytical Exposition",
    category: "Writing",
    description: "Thesis statements, transitional arguments (furthermore, on the other hand), and concluding re-iterations."
  },
  {
    id: "g11-passive",
    grade: "Grade 11",
    topic: "Passive Voice in Scientific & Natural Reports",
    title: "Passive Voice Mastery",
    category: "Grammar",
    description: "Transforming active sentences to passive voice in natural process descriptions."
  },
  {
    id: "g11-cause-effect",
    grade: "Grade 11",
    topic: "Cause and Effect Relationships (Because of, Due to, Consequently)",
    title: "Cause & Effect Connectors",
    category: "Grammar",
    description: "Connecting clauses using cause-and-effect conjunctions in formal academic writing."
  },

  // Grade 12
  {
    id: "g12-hortatory",
    grade: "Grade 12",
    topic: "Hortatory Exposition — Recommendation & Action Plans",
    title: "Hortatory Exposition",
    category: "Writing",
    description: "Recommendation structures (should, ought to) and persuasive arguments for real-world issues."
  },
  {
    id: "g12-application-letter",
    grade: "Grade 12",
    topic: "Application Letter & Curriculum Vitae Vocabulary",
    title: "Job Application & CV",
    category: "Vocabulary",
    description: "Professional correspondence vocabulary, qualifications, work ethic, and enclosures."
  },
  {
    id: "g12-utbk-drill",
    grade: "Grade 12",
    topic: "UTBK SNBT English Reading & Structure Drills",
    title: "UTBK Exam Prep",
    category: "UTBK Prep",
    description: "High-frequency academic vocabulary, inference questions, and complex sentence structures."
  }
];
