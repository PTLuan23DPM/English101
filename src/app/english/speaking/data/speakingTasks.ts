export interface SpeakingTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  prompt: string;
  timeLimit: string;
  tips: string[];
  vocab: Array<{ word: string; ipa: string }>;
  phrases: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
}

export const SPEAKING_TASKS: SpeakingTask[] = [
  {
    id: "pron-intro",
    icon: "👋",
    title: "Self Introduction",
    type: "Pronunciation",
    level: "A2",
    prompt:
      "Introduce yourself to a new colleague at work. Include your name, job position, and something interesting about yourself.",
    timeLimit: "2 min",
    tips: [
      "Speak clearly and at moderate pace",
      "Use natural intonation",
      "Pause between main ideas",
    ],
    vocab: [
      { word: "introduce", ipa: "/ˌɪntrəˈdjuːs/" },
      { word: "colleague", ipa: "/ˈkɒliːɡ/" },
      { word: "position", ipa: "/pəˈzɪʃn/" },
    ],
    phrases: [
      "✓ Hi, I'm... and I work as...",
      "✓ Nice to meet you",
      "✓ I've been working here for...",
      "✓ In my free time, I enjoy...",
    ],
    recommended: true,
    attempts: 0,
    color: "blue",
  },
  {
    id: "pron-numbers",
    icon: "🔢",
    title: "Numbers & Dates",
    type: "Pronunciation",
    level: "A2",
    prompt:
      "Practice pronouncing numbers, prices, dates, and times correctly. Read aloud the provided examples.",
    timeLimit: "3 min",
    tips: [
      "Pay attention to stress patterns",
      "Practice -teen vs -ty sounds",
      "Use rising intonation for dates",
    ],
    vocab: [
      { word: "thirteen", ipa: "/ˌθɜːrˈtiːn/" },
      { word: "thirty", ipa: "/ˈθɜːrti/" },
      { word: "receipt", ipa: "/rɪˈsiːt/" },
    ],
    phrases: [
      "✓ The meeting is at 2:30 PM",
      "✓ My birthday is on March 15th",
      "✓ That costs $13.50",
    ],
    attempts: 0,
    color: "blue",
  },
  {
    id: "topic-season",
    icon: "🌸",
    title: "Favorite Season",
    type: "Topic Discussion",
    level: "B1",
    prompt:
      "Talk about your favorite season of the year. Explain why you prefer it and what activities you enjoy during that time.",
    timeLimit: "3 min",
    tips: [
      "Organize your ideas: introduction, reasons, conclusion",
      "Use descriptive adjectives",
      "Give specific examples",
    ],
    vocab: [
      { word: "season", ipa: "/ˈsiːzn/" },
      { word: "prefer", ipa: "/prɪˈfɜːr/" },
      { word: "activity", ipa: "/ækˈtɪvɪti/" },
    ],
    phrases: [
      "✓ My favorite season is...",
      "✓ I prefer it because...",
      "✓ During this time, I usually...",
      "✓ What I love most is...",
    ],
    recommended: true,
    attempts: 0,
    color: "green",
  },
  {
    id: "topic-technology",
    icon: "💻",
    title: "Technology in Daily Life",
    type: "Topic Discussion",
    level: "B2",
    prompt:
      "Discuss how technology has changed your daily life. Talk about both positive and negative aspects.",
    timeLimit: "4 min",
    tips: [
      "Present balanced viewpoint",
      "Use linking words (however, moreover)",
      "Support opinions with examples",
    ],
    vocab: [
      { word: "convenient", ipa: "/kənˈviːniənt/" },
      { word: "rely", ipa: "/rɪˈlaɪ/" },
      { word: "distraction", ipa: "/dɪˈstrækʃn/" },
    ],
    phrases: [
      "✓ On one hand..., on the other hand...",
      "✓ Technology has made it possible to...",
      "✓ However, there are some downsides...",
    ],
    attempts: 0,
    color: "green",
  },
  {
    id: "role-restaurant",
    icon: "🍴",
    title: "At the Restaurant",
    type: "Role Play",
    level: "A2",
    prompt:
      "You are at a restaurant. Order a meal, ask about ingredients, and request a drink. Be polite and natural.",
    timeLimit: "2-3 min",
    tips: [
      "Use polite expressions: Could I have..., I'd like...",
      "Ask clarifying questions",
      "Show appreciation: Thank you, That sounds great",
    ],
    vocab: [
      { word: "order", ipa: "/ˈɔːrdər/" },
      { word: "ingredient", ipa: "/ɪnˈɡriːdiənt/" },
      { word: "recommend", ipa: "/ˌrekəˈmend/" },
    ],
    phrases: [
      "✓ Could I have..., please?",
      "✓ What do you recommend?",
      "✓ Does this contain...?",
      "✓ I'd like to order...",
    ],
    recommended: true,
    attempts: 0,
    color: "purple",
  },
  {
    id: "role-doctor",
    icon: "🏥",
    title: "Doctor Appointment",
    type: "Role Play",
    level: "B1",
    prompt: "You are visiting a doctor. Describe your symptoms and answer questions about your health.",
    timeLimit: "3 min",
    tips: [
      "Describe symptoms clearly",
      "Answer questions with details",
      "Use medical vocabulary appropriately",
    ],
    vocab: [
      { word: "symptom", ipa: "/ˈsɪmptəm/" },
      { word: "prescribe", ipa: "/prɪˈskraɪb/" },
      { word: "allergy", ipa: "/ˈælərdʒi/" },
    ],
    phrases: [
      "✓ I've been feeling...",
      "✓ It started about... ago",
      "✓ Do I need any medication?",
    ],
    attempts: 0,
    color: "purple",
  },
  {
    id: "pic-coffee-shop",
    icon: "☕",
    title: "Busy Coffee Shop",
    type: "Picture Description",
    level: "B1",
    prompt:
      "Describe the scene you imagine: A busy coffee shop on a weekend morning. Include details about people, atmosphere, and activities.",
    timeLimit: "2 min",
    tips: [
      "Start with an overview",
      "Use present continuous: people are sitting, someone is ordering",
      "Describe from general to specific details",
    ],
    vocab: [
      { word: "atmosphere", ipa: "/ˈætməsfɪər/" },
      { word: "crowded", ipa: "/ˈkraʊdɪd/" },
      { word: "background", ipa: "/ˈbækɡraʊnd/" },
    ],
    phrases: [
      "✓ In this scene, I can see...",
      "✓ In the foreground/background...",
      "✓ There are several people who are...",
      "✓ The atmosphere seems...",
    ],
    attempts: 0,
    color: "teal",
  },
  {
    id: "pic-park",
    icon: "🏞️",
    title: "Park Activities",
    type: "Picture Description",
    level: "B2",
    prompt:
      "Describe a busy park scene with various activities. Include weather, people's emotions, and background details.",
    timeLimit: "3 min",
    tips: [
      "Use varied vocabulary for colors and emotions",
      "Include weather and time of day",
      "Describe spatial relationships",
    ],
    vocab: [
      { word: "leisure", ipa: "/ˈleʒər/" },
      { word: "stroll", ipa: "/stroʊl/" },
      { word: "vicinity", ipa: "/vəˈsɪnəti/" },
    ],
    phrases: [
      "✓ It appears to be...",
      "✓ Next to/near/in front of...",
      "✓ The people seem to be enjoying...",
    ],
    attempts: 0,
    color: "teal",
  },
  {
    id: "interview-job",
    icon: "💼",
    title: "Job Interview",
    type: "Interview Practice",
    level: "B2",
    prompt:
      "Practice answering common job interview questions. Explain your strengths, experience, and why you're a good fit.",
    timeLimit: "5 min",
    tips: [
      "Use STAR method (Situation, Task, Action, Result)",
      "Be specific with examples",
      "Show enthusiasm and confidence",
    ],
    vocab: [
      { word: "strength", ipa: "/streŋkθ/" },
      { word: "collaborate", ipa: "/kəˈlæbəreɪt/" },
      { word: "achievement", ipa: "/əˈtʃiːvmənt/" },
    ],
    phrases: [
      "✓ My greatest strength is...",
      "✓ I have experience in...",
      "✓ For example, in my previous role...",
      "✓ I'm particularly interested in this position because...",
    ],
    recommended: true,
    attempts: 0,
    color: "indigo",
  },
];




