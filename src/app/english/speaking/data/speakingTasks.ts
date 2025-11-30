export interface SpeakingTask {
  id: string;
  title: string;
  type: string;
  level: string;
  prompt: string;
  timeLimit: string;
  tips: string[];
  vocab: Array<{ word: string; ipa: string }>;
  phrases: string[];
  conversation?: string[]; // Full conversation text from JSON
  fullText?: string; // Full text for reference
  recommended?: boolean;
  attempts: number;
}

export const SPEAKING_TASKS: SpeakingTask[] = [
  // Conversation Practice - Beginner Level
  {
    id: "conv-budget-cuts",
    title: "Budget Cuts",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about work and budget cuts. Focus on natural pronunciation and intonation.",
    timeLimit: "3-4 min",
    tips: [
      "Listen to the conversation first",
      "Practice each line with natural pauses",
      "Pay attention to question intonation",
      "Focus on work-related vocabulary",
    ],
    vocab: [
      { word: "budget", ipa: "/ˈbʌdʒɪt/" },
      { word: "meeting", ipa: "/ˈmiːtɪŋ/" },
      { word: "reporter", ipa: "/rɪˈpɔːrtər/" },
      { word: "videographer", ipa: "/ˌvɪdiˈɒɡrəfər/" },
    ],
    phrases: [
      "✓ What do you think today's meeting is about?",
      "✓ I have heard people talking about...",
      "✓ That's how rumors start",
      "✓ I'm not going to fire any of you",
    ],
    recommended: true,
    attempts: 0,
  },
  {
    id: "conv-interview",
    title: "The Interview",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the job interview conversation. Focus on phrasal verbs and professional communication.",
    timeLimit: "3-4 min",
    tips: [
      "Practice phrasal verbs: go back, team up, throw away",
      "Use formal language for interviews",
      "Pay attention to question-answer patterns",
      "Practice being clear and direct",
    ],
    vocab: [
      { word: "interview", ipa: "/ˈɪntərvjuː/" },
      { word: "assignment", ipa: "/əˈsaɪnmənt/" },
      { word: "opportunity", ipa: "/ˌɒpərˈtuːnəti/" },
      { word: "honest", ipa: "/ˈɒnɪst/" },
    ],
    phrases: [
      "✓ Thanks for coming in",
      "✓ I need to find out if...",
      "✓ I want you to be completely honest",
      "✓ What work of yours are you most proud of?",
    ],
    attempts: 0,
  },
  {
    id: "conv-he-said-she-said",
    title: "He Said - She Said",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation using past perfect tense. Focus on reporting what people said.",
    timeLimit: "3-4 min",
    tips: [
      "Practice past perfect tense: had + past participle",
      "Use reported speech patterns",
      "Pay attention to time relationships",
      "Practice taking turns in conversation",
    ],
    vocab: [
      { word: "promise", ipa: "/ˈprɒmɪs/" },
      { word: "consultant", ipa: "/kənˈsʌltənt/" },
      { word: "taste", ipa: "/teɪst/" },
      { word: "turn", ipa: "/tɜːrn/" },
    ],
    phrases: [
      "✓ Pete had promised to meet me",
      "✓ You have to take turns",
      "✓ I can see already that...",
      "✓ What happened?",
    ],
    attempts: 0,
  },
  {
    id: "conv-circus",
    title: "Run Away With the Circus!",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about career changes and following dreams. Focus on expressing opinions and giving advice.",
    timeLimit: "4-5 min",
    tips: [
      "Express opinions clearly",
      "Use advice-giving phrases",
      "Practice emotional expressions",
      "Focus on career-related vocabulary",
    ],
    vocab: [
      { word: "circus", ipa: "/ˈsɜːrkəs/" },
      { word: "career", ipa: "/kəˈrɪər/" },
      { word: "dream", ipa: "/driːm/" },
      { word: "advice", ipa: "/ədˈvaɪs/" },
    ],
    phrases: [
      "✓ What do you think about...?",
      "✓ I think you should...",
      "✓ That sounds like a great idea",
      "✓ Follow your dreams",
    ],
    recommended: true,
    attempts: 0,
  },
  {
    id: "conv-vacation",
    title: "Greatest Vacation of All Time",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about vacations and travel experiences. Focus on past tense and descriptive language.",
    timeLimit: "4-5 min",
    tips: [
      "Use past tense for experiences",
      "Describe places and activities",
      "Express excitement and enthusiasm",
      "Use travel-related vocabulary",
    ],
    vocab: [
      { word: "vacation", ipa: "/vəˈkeɪʃn/" },
      { word: "experience", ipa: "/ɪkˈspɪriəns/" },
      { word: "amazing", ipa: "/əˈmeɪzɪŋ/" },
      { word: "adventure", ipa: "/ədˈventʃər/" },
    ],
    phrases: [
      "✓ That was the best vacation",
      "✓ I had an amazing time",
      "✓ We did so many things",
      "✓ I'll never forget that",
    ],
    attempts: 0,
  },
  {
    id: "conv-float",
    title: "Will It Float",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about science experiments and predictions. Focus on asking questions and making predictions.",
    timeLimit: "3-4 min",
    tips: [
      "Ask questions clearly",
      "Make predictions using will/won't",
      "Express surprise and reactions",
      "Use scientific vocabulary",
    ],
    vocab: [
      { word: "float", ipa: "/floʊt/" },
      { word: "experiment", ipa: "/ɪkˈsperɪmənt/" },
      { word: "predict", ipa: "/prɪˈdɪkt/" },
      { word: "sink", ipa: "/sɪŋk/" },
    ],
    phrases: [
      "✓ Will it float?",
      "✓ I think it will...",
      "✓ That's interesting!",
      "✓ Let's find out",
    ],
    attempts: 0,
  },
  {
    id: "conv-tour-guide",
    title: "Tip Your Tour Guide",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about tipping and service. Focus on polite requests and expressing gratitude.",
    timeLimit: "3-4 min",
    tips: [
      "Use polite expressions",
      "Express gratitude naturally",
      "Ask for information politely",
      "Practice service-related vocabulary",
    ],
    vocab: [
      { word: "tip", ipa: "/tɪp/" },
      { word: "tour", ipa: "/tʊər/" },
      { word: "guide", ipa: "/ɡaɪd/" },
      { word: "gratitude", ipa: "/ˈɡrætɪtuːd/" },
    ],
    phrases: [
      "✓ How much should I tip?",
      "✓ Thank you so much",
      "✓ That was very helpful",
      "✓ I really appreciate it",
    ],
    attempts: 0,
  },
  {
    id: "conv-pets",
    title: "Pets Are Family, Too!",
    type: "Conversation Practice",
    level: "A2",
    prompt: "Practice the conversation about pets and family. Focus on expressing feelings and personal experiences.",
    timeLimit: "4-5 min",
    tips: [
      "Express personal feelings",
      "Share experiences about pets",
      "Use family-related vocabulary",
      "Practice emotional expressions",
    ],
    vocab: [
      { word: "pet", ipa: "/pet/" },
      { word: "family", ipa: "/ˈfæməli/" },
      { word: "care", ipa: "/ker/" },
      { word: "love", ipa: "/lʌv/" },
    ],
    phrases: [
      "✓ Pets are like family",
      "✓ I love my pet",
      "✓ They need our care",
      "✓ They bring so much joy",
    ],
    recommended: true,
    attempts: 0,
  },
];

