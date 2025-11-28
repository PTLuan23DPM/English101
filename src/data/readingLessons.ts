export type ReadingExerciseType = "mcq" | "trueFalse" | "short" | "evidence";

export interface ReadingExerciseBase {
  id: string;
  prompt: string;
  skill: string;
  reference?: string;
}

export interface ReadingExerciseMCQ extends ReadingExerciseBase {
  type: "mcq";
  options: string[];
  answer: string;
}

export interface ReadingExerciseTrueFalse extends ReadingExerciseBase {
  type: "trueFalse";
  answer: boolean;
  rationale?: string;
}

export interface ReadingExerciseShort extends ReadingExerciseBase {
  type: "short";
  expected: string[];
  sampleAnswer?: string;
}

export interface ReadingExerciseEvidence extends ReadingExerciseBase {
  type: "evidence";
  expectedKeywords: string[];
  guidance: string;
}

export type ReadingExercise =
  | ReadingExerciseMCQ
  | ReadingExerciseTrueFalse
  | ReadingExerciseShort
  | ReadingExerciseEvidence;

export interface ReadingLessonSection {
  heading: string;
  summary?: string;
  paragraphs: string[];
}

export interface ReadingVocabulary {
  word: string;
  meaning: string;
  example: string;
}

export interface ReadingLesson {
  id: string;
  title: string;
  subtitle: string;
  cefr: "A1" | "A2" | "B1" | "B2" | "C1";
  genre: string;
  source: string;
  tags: string[];
  estimatedTime: number;
  wordCount: number;
  coverEmoji: string;
  gradient: string;
  readingSkills: string[];
  keyIdeas: string[];
  vocabulary: ReadingVocabulary[];
  contentSections: ReadingLessonSection[];
  exercises: ReadingExercise[];
}

export const READING_LESSONS: ReadingLesson[] = [
  {
    id: "budget-cuts",
    title: "Budget Cuts at The Studio",
    subtitle: "Rumors, reassurance, and new assignments",
    cefr: "A2",
    genre: "Workplace Drama",
    source: "Voice of America – “Budget Cuts”",
    tags: ["Workplace", "Dialogue", "Rumors"],
    estimatedTime: 10,
    wordCount: 780,
    coverEmoji: "🏢",
    gradient: "linear-gradient(135deg,#d8b4fe,#818cf8)",
    readingSkills: [
      "Identify main idea in dialogues",
      "Trace cause & effect",
      "Recognize tone shifts",
    ],
    keyIdeas: [
      "Rumors about budget cuts create unnecessary fear.",
      "Ms. Weaver clarifies that only one position was removed.",
      "The team earns new assignments instead of losing jobs.",
    ],
    vocabulary: [
      {
        word: "budget cuts",
        meaning: "reductions made to save money",
        example: "Rumors about budget cuts spread quickly through the office.",
      },
      {
        word: "gossip",
        meaning: "informal talk that may be untrue",
        example: "Anna warns Jonathan not to start gossip.",
      },
      {
        word: "résumé",
        meaning: "document listing work experience",
        example: "Kaveh updates his résumé just in case.",
      },
      {
        word: "assignment",
        meaning: "a task you are officially given",
        example: "Ms. Weaver hands out new assignments at the end.",
      },
    ],
    contentSections: [
      {
        heading: "Whispers in the hallway",
        summary:
          "An email about an 'important meeting' sparks nervous chatter among Anna and her coworkers.",
        paragraphs: [
          "Anna sees a note that everyone must attend a sudden meeting. She jokes that maybe they are all getting raises, but Jonathan has already heard hallway whispers about budget cuts.",
          "Anna challenges the rumor: One person in accounting is not the same thing as “people” in the whole building. Still, both of them decide to stop speculating and simply wait for facts.",
          "Despite Anna's warning, the phrase “budget cuts” spreads fast. Amelia overhears it, tells Kaveh, and soon the fear is that layoffs are coming for everyone.",
        ],
      },
      {
        heading: "Fear takes over",
        summary:
          "Different coworkers imagine the worst-case scenario before the meeting even begins.",
        paragraphs: [
          "Amelia insists budget cuts always mean someone loses a job. Kaveh tries to calm her, reminding her that she's a good reporter. She answers that she cannot go back to being a detective because, frankly, criminals frighten her.",
          "Kaveh also admits he has no interest in returning to his old teaching job because high-school students scare him. The two friends realize they are letting fear run wild.",
          "Elsewhere, Kaveh warns Penelope to update her résumé. He even says he's already updated his own. Anxiety spreads faster than any official information.",
        ],
      },
      {
        heading: "Ms. Weaver sets the record straight",
        summary:
          "The boss finally addresses the team and shuts down the rumors.",
        paragraphs: [
          "When Ms. Weaver arrives, she is confused by the pale faces in the room. People look as if they are about to be fired, and she cannot understand why.",
          "Anna raises her hand and explains that everyone is afraid of losing their job. Ms. Weaver laughs gently and says the meeting is to praise their good work and to assign new responsibilities.",
          "She does admit that budget cuts are real, but only one person—Mark in Accounting—lost his job so far. She asks the team to focus on their new assignments instead of feeding rumors.",
        ],
      },
    ],
    exercises: [
      {
        id: "budget-mcq-1",
        type: "mcq",
        prompt: "Why does Ms. Weaver call the meeting?",
        options: [
          "To announce multiple layoffs",
          "To congratulate the team and assign new tasks",
          "To cancel upcoming projects",
          "To introduce a new boss",
        ],
        answer: "To congratulate the team and assign new tasks",
        skill: "Identify purpose",
        reference: "Ms. Weaver explains the real reason for the meeting.",
      },
      {
        id: "budget-tf-1",
        type: "trueFalse",
        prompt: "True or False: Everyone in the department loses their job.",
        answer: false,
        rationale: "Only Mark in Accounting is affected.",
        skill: "Detail check",
        reference: "Boss clarifies that only one position was cut.",
      },
      {
        id: "budget-short-1",
        type: "short",
        prompt:
          "Name two previous jobs that scare Amelia and Kaveh when they imagine going back.",
        expected: ["detective", "teacher"],
        sampleAnswer: "Amelia was once a detective, and Kaveh used to be a teacher.",
        skill: "Recall support details",
        reference: "Conversation between Amelia and Kaveh.",
      },
      {
        id: "budget-evidence-1",
        type: "evidence",
        prompt:
          "In 2–3 sentences, explain how gossip changes the team's mood before the meeting.",
        expectedKeywords: ["rumor", "budget cuts", "fear", "résumé", "lose jobs"],
        guidance:
          "Mention how one phrase spreads and what actions people take because of it.",
        skill: "Summarize impact",
        reference: "Whispers in the hallway & Fear takes over sections.",
      },
    ],
  },
  {
    id: "the-interview",
    title: "The Interview",
    subtitle: "Anna needs a co-host, and Pete needs a job",
    cefr: "A2",
    genre: "Dialogue / Workplace",
    source: "Voice of America – “The Interview”",
    tags: ["Jobs", "Phrasal Verbs", "Interpersonal"],
    estimatedTime: 11,
    wordCount: 820,
    coverEmoji: "🎙️",
    gradient: "linear-gradient(135deg,#fcd34d,#f97316)",
    readingSkills: [
      "Track character motivation",
      "Notice phrasal verbs",
      "Infer tone from dialogue",
    ],
    keyIdeas: [
      "Anna is promoted but must partner with someone different from her personality.",
      "Pete doubts himself yet still accepts the interview.",
      "Ms. Weaver values contrasting voices for the new talk show.",
    ],
    vocabulary: [
      {
        word: "team up",
        meaning: "to work with someone else",
        example: "Anna must team up with someone unlike her.",
      },
      {
        word: "tear up",
        meaning: "to rip into pieces",
        example: "Pete starts to tear up the want ads.",
      },
      {
        word: "come in",
        meaning: "arrive for a meeting or interview",
        example: "Ms. Weaver says, “Thanks for coming in, Pete.”",
      },
    ],
    contentSections: [
      {
        heading: "New assignments",
        paragraphs: [
          "Anna is relieved that the budget meeting was good news. Ms. Weaver now wants her back in the hosting chair and needs her to partner with someone who is very different.",
          "Anna agrees immediately but is curious. She is cheerful and social, so who will balance her out?",
        ],
      },
      {
        heading: "Finding the right partner",
        paragraphs: [
          "Anna thinks of Pete, a serious friend who is between jobs. She interrupts him as he searches want ads and tells him to throw them away because she has a job lead.",
          "Pete is confused. Anna gives him the time and address of the interview but refuses to explain what 'different' means. She just says, “Be yourself.”",
        ],
      },
      {
        heading: "The interview itself",
        paragraphs: [
          "Ms. Weaver asks Pete about his people skills. He admits he thinks people talk too much and proudly shares that he once isolated himself to write a book.",
          "Even though these answers sound negative, Ms. Weaver decides he is exactly the contrast she wants.",
          "When Pete tells Anna he got the job, she cheers. The two celebrate, ready to build a talk show with opposing personalities.",
        ],
      },
    ],
    exercises: [
      {
        id: "interview-mcq-1",
        type: "mcq",
        prompt: "Why does Anna choose Pete as a potential co-host?",
        options: [
          "He loves entertaining crowds.",
          "He is the most cheerful person she knows.",
          "He is very different from her and balances her energy.",
          "He already works at The Studio.",
        ],
        answer: "He is very different from her and balances her energy.",
        skill: "Inference",
        reference: "Conversation between Anna and Ms. Weaver.",
      },
      {
        id: "interview-tf-1",
        type: "trueFalse",
        prompt: "True or False: Pete lies about his past to impress Ms. Weaver.",
        answer: false,
        rationale: "He is honest about liking silence and being grumpy.",
        skill: "Evaluate evidence",
        reference: "Interview scene with Ms. Weaver.",
      },
      {
        id: "interview-short-1",
        type: "short",
        prompt:
          "List two phrasal verbs from the story and explain their meaning in context.",
        expected: ["team up", "tear up"],
        sampleAnswer:
          "Team up = work together; tear up = rip into pieces (the want ads).",
        skill: "Language focus",
        reference: "Early section about new assignments.",
      },
      {
        id: "interview-evidence-1",
        type: "evidence",
        prompt:
          "In a short paragraph, describe how Pete’s honesty ironically helps him get the job.",
        expectedKeywords: ["honest", "grumpy", "balance", "different", "truthful"],
        guidance:
          "Mention what Ms. Weaver wanted and how Pete fits that description.",
        skill: "Explain irony",
        reference: "Interview scene conclusion.",
      },
    ],
  },
  {
    id: "he-said-she-said",
    title: "He Said – She Said",
    subtitle: "Past perfect drama on the way to a meeting",
    cefr: "B1",
    genre: "Dialogue / Grammar Focus",
    source: "Voice of America – “He Said - She Said”",
    tags: ["Grammar", "Point of view", "Conflict"],
    estimatedTime: 12,
    wordCount: 950,
    coverEmoji: "🗣️",
    gradient: "linear-gradient(135deg,#fda4af,#fb7185)",
    readingSkills: [
      "Compare perspectives",
      "Notice past perfect forms",
      "Analyze consultant's solution",
    ],
    keyIdeas: [
      "Anna and Pete remember the morning differently.",
      "Past perfect shows what happened first.",
      "Kelly turns their disagreement into a show concept.",
    ],
    vocabulary: [
      {
        word: "consultant",
        meaning: "expert hired to solve a problem",
        example:
          "Kelly acts as a consultant to help the duo manage their conflict.",
      },
      {
        word: "past perfect",
        meaning: "grammar tense formed with 'had' + past participle",
        example: "Anna says, “Pete had wasted time waiting for coffee.”",
      },
      {
        word: "point of view",
        meaning: "how one person sees or interprets events",
        example: "Kelly notices they each have a different point of view.",
      },
    ],
    contentSections: [
      {
        heading: "Late to the consultant",
        paragraphs: [
          "Anna and Pete arrive forty-three minutes late to meet Kelly. Both immediately blame the other person for the delay.",
          "Kelly demands that they take turns. Anna explains that she had waited by the tree while Pete took forever to get his 'special coffee.'",
          "Pete argues back that he HAD arrived on time, but Anna insisted on taking a scooter and later stopped to feed birds she had named after storybook characters.",
        ],
      },
      {
        heading: "Understanding past perfect",
        paragraphs: [
          "Professor Bot interrupts to remind viewers that the past perfect highlights the first action. Anna had waited. Pete had grabbed coffee. These earlier actions set the stage for why they were late.",
        ],
      },
      {
        heading: "The solution",
        paragraphs: [
          "Kelly realizes their constant disagreement can actually become a show concept.",
          "She proposes the name “He Said, She Said,” where the duo shares two angles on every story.",
          "Anna loves the idea, and even Pete admits their differences could become entertaining instead of annoying.",
        ],
      },
    ],
    exercises: [
      {
        id: "hsss-mcq-1",
        type: "mcq",
        prompt:
          "What lesson does Professor Bot want viewers to learn from this episode?",
        options: [
          "How to ride a scooter safely",
          "How to debate calmly",
          "How to use past perfect to show what happened first",
          "How to apologize for being late",
        ],
        answer: "How to use past perfect to show what happened first",
        skill: "Grammar focus",
        reference: "Middle section commentary.",
      },
      {
        id: "hsss-tf-1",
        type: "trueFalse",
        prompt: "True or False: Kelly becomes frustrated and quits.",
        answer: false,
        rationale: "She actually invents a new show idea.",
        skill: "Comprehension",
        reference: "The solution section.",
      },
      {
        id: "hsss-short-1",
        type: "short",
        prompt:
          "Rewrite this sentence using past perfect: 'Pete arrived, and Anna fed the birds.' Show the order Anna described.",
        expected: ["Pete had arrived", "Anna fed the birds"],
        sampleAnswer: "Pete had arrived on time before Anna fed the birds.",
        skill: "Grammar production",
        reference: "Dialogue recaps.",
      },
      {
        id: "hsss-evidence-1",
        type: "evidence",
        prompt:
          "Explain how Kelly turns conflict into a creative opportunity. Use at least two details from the lesson.",
        expectedKeywords: ["show idea", "different points of view", "He Said, She Said", "late", "consultant"],
        guidance:
          "Include why she thinks disagreement can attract viewers.",
        skill: "Synthesize",
        reference: "The solution section.",
      },
    ],
  },
  {
    id: "circus-arts",
    title: "Run Away With the Circus",
    subtitle: "Are performers artists or athletes?",
    cefr: "B1",
    genre: "Opinion / Dialogue",
    source: "Voice of America – “Run Away With the Circus!”",
    tags: ["Arts", "Debate", "Opinions"],
    estimatedTime: 13,
    wordCount: 980,
    coverEmoji: "🎪",
    gradient: "linear-gradient(135deg,#6ee7b7,#3b82f6)",
    readingSkills: [
      "Differentiate claims and evidence",
      "Track agreement & disagreement",
      "Identify descriptive vocabulary",
    ],
    keyIdeas: [
      "Anna sees circus performers as artists telling stories.",
      "Pete views them as athletes with costumes.",
      "Interviews with performers highlight creativity, not competition.",
    ],
    vocabulary: [
      {
        word: "trapeze",
        meaning: "swinging bar used in circus acrobatics",
        example: "Anna calls them trapeze artists to make her point.",
      },
      {
        word: "juggler",
        meaning: "performer who keeps several objects in the air",
        example: "Pete says jugglers simply throw things back and forth.",
      },
      {
        word: "embody",
        meaning: "to express or represent in bodily form",
        example:
          "Piper says performers embody characters while moving gracefully.",
      },
    ],
    contentSections: [
      {
        heading: "Debating art vs. athletics",
        paragraphs: [
          "Anna wants to 'run away with the circus' after visiting a festival. Pete is skeptical and says swinging from ropes is an athletic trick, not art.",
          "They go back and forth, each repeating “Yes, it is!” and “No, it isn’t!” before agreeing to investigate further.",
        ],
      },
      {
        heading: "Hearing from performers",
        paragraphs: [
          "Anna interviews Kate and Piper, aerialists who explain that circus shows are collaborative stories, not competitions.",
          "They describe how circus performers must act, create characters, and move fluidly. Athletic strength is only part of the performance.",
        ],
      },
      {
        heading: "Finding common ground",
        paragraphs: [
          "Pete finally admits he likes the costumes and can see the artistry when performers tell stories.",
          "He tells Anna she is right—circus arts are beautiful. Professor Bot celebrates that they finally agreed!",
        ],
      },
    ],
    exercises: [
      {
        id: "circus-mcq-1",
        type: "mcq",
        prompt:
          "Which argument convinces Pete that circus performers are artists?",
        options: [
          "They win big prizes like athletes.",
          "They compete for medals every night.",
          "They embody characters and tell stories while performing.",
          "They only train on gymnastics equipment.",
        ],
        answer: "They embody characters and tell stories while performing.",
        skill: "Identify supporting detail",
        reference: "Interviews with Kate and Piper.",
      },
      {
        id: "circus-tf-1",
        type: "trueFalse",
        prompt: "True or False: Kate says circus work is mainly competitive.",
        answer: false,
        rationale: "She says it’s about performing and having fun, not winning.",
        skill: "Detail check",
        reference: "Performer testimony.",
      },
      {
        id: "circus-short-1",
        type: "short",
        prompt:
          "Quote or paraphrase one sentence that shows Anna and Pete finally agree.",
        expected: ["You're right, Anna.", "We can agree they are amazing."],
        sampleAnswer: "Pete tells Anna, “You’re right. It’s just so beautiful.”",
        skill: "Find evidence",
        reference: "Final section.",
      },
      {
        id: "circus-evidence-1",
        type: "evidence",
        prompt:
          "Explain in your own words why circus performers reject the idea that they are only athletes.",
        expectedKeywords: ["story", "art form", "characters", "not competing", "movement"],
        guidance:
          "Mention both creativity and the lack of competition mentioned by Kate or Piper.",
        skill: "Paraphrase viewpoints",
        reference: "Performer interviews.",
      },
    ],
  },
  {
    id: "knitting-cinema",
    title: "Knitting While Watching Movies",
    subtitle: "A social hobby trend in Vienna",
    cefr: "B1",
    genre: "Feature Article",
    source:
      "VOA Learning English – “Knitting While Watching Movies Gains Popularity”",
    tags: ["Lifestyle", "Trends", "Community"],
    estimatedTime: 14,
    wordCount: 1050,
    coverEmoji: "🧶",
    gradient: "linear-gradient(135deg,#f9a8d4,#f472b6)",
    readingSkills: [
      "Identify reasons and results",
      "Track statistics in informational text",
      "Summarize viewpoints",
    ],
    keyIdeas: [
      "Vienna hosts monthly knitting-at-the-movies nights.",
      "People seek community after pandemic isolation.",
      "Organizers focus on cozy films and gentle lighting.",
    ],
    vocabulary: [
      {
        word: "crochet",
        meaning: "create fabric with a hooked needle",
        example: "Alexander Koch jokes about crocheting like a grandmother.",
      },
      {
        word: "spokesperson",
        meaning: "person who represents an organization",
        example:
          "Lisa Stolze, the spokesperson for Votiv Kino, explains the movement.",
      },
      {
        word: "exchange",
        meaning: "interact or share with others",
        example:
          "Soft lighting remains on so attendees can knit and exchange tips.",
      },
    ],
    contentSections: [
      {
        heading: "A new kind of movie night",
        paragraphs: [
          "Nearly 200 people gather at Vienna's Votiv Kino to knit or crochet while watching 'The Devil Wears Prada.' Soft lights stay on, letting people avoid mistakes and interact during the film.",
          "Organizer Luisa Palmer says she began the events after the pandemic because people wanted to meet in real life, not just online.",
        ],
      },
      {
        heading: "Why it matters",
        paragraphs: [
          "Participants knit, eat snacks, and even breastfeed babies. For many, the attraction is reconnecting with something tangible, using 'all ten fingers' instead of only screens.",
          "Austrian Alexander Koch laughs that knitting sounds old-fashioned, yet it relaxes him. Student Kaja Vospernik says theaters are the perfect place because she already knits while streaming shows at home.",
        ],
      },
      {
        heading: "Looking ahead",
        paragraphs: [
          "Events are sold out each month, and organizers base their model on similar gatherings in the U.S. and Northern Europe.",
          "Palmer emphasizes choosing cozy comedies, not scary films that could make knitters drop their stitches.",
        ],
      },
    ],
    exercises: [
      {
        id: "knit-mcq-1",
        type: "mcq",
        prompt:
          "Why does the cinema keep a soft light on during the screenings?",
        options: [
          "To film the audience",
          "So people can buy more snacks",
          "To help knitters avoid mistakes and talk with each other",
          "Because the projector is broken",
        ],
        answer: "To help knitters avoid mistakes and talk with each other",
        skill: "Detail comprehension",
        reference: "Opening section.",
      },
      {
        id: "knit-tf-1",
        type: "trueFalse",
        prompt: "True or False: The organizers prefer scary horror films.",
        answer: false,
        rationale: "They choose cozy comedies so people stay relaxed.",
        skill: "Reading for gist",
        reference: "Looking ahead section.",
      },
      {
        id: "knit-short-1",
        type: "short",
        prompt:
          "List two reasons attendees give for loving the knitting cinema nights.",
        expected: ["community", "relaxing", "tangible", "slow down", "avoid screens"],
        sampleAnswer:
          "They reconnect with people offline and enjoy doing something with their hands.",
        skill: "Summarize support",
        reference: "Why it matters section.",
      },
      {
        id: "knit-evidence-1",
        type: "evidence",
        prompt:
          "Explain how the pandemic influenced this trend. Use evidence from the text.",
        expectedKeywords: ["lockdown", "meet in real life", "started knitting", "community"],
        guidance:
          "Mention Palmer’s observation about people seeking in-person connection.",
        skill: "Cause & effect",
        reference: "Organizer quotes in section one.",
      },
    ],
  },
  {
    id: "greatest-vacation",
    title: "Greatest Vacation of All Time",
    subtitle: "Comparing travel options with comparatives and superlatives",
    cefr: "A2",
    genre: "Dialogue / Travel",
    source: "Voice of America – “Greatest Vacation of All Time”",
    tags: ["Travel", "Grammar", "Comparatives"],
    estimatedTime: 12,
    wordCount: 890,
    coverEmoji: "✈️",
    gradient: "linear-gradient(135deg,#60a5fa,#34d399)",
    readingSkills: [
      "Recognize comparative and superlative forms",
      "Compare travel options",
      "Identify sales tactics",
    ],
    keyIdeas: [
      "Dan uses comparatives to sell increasingly expensive vacations.",
      "Anna describes her travel preferences with superlatives.",
      "The Travel Max 2000 machine catches fire during the pitch.",
    ],
    vocabulary: [
      {
        word: "comparative",
        meaning: "form used to compare two things (better, pricier)",
        example: "Dan says the Deep Sea Adventure is better than the Mountain Getaway.",
      },
      {
        word: "superlative",
        meaning: "form showing the most extreme (best, priciest, scariest)",
        example: "Anna says biking is THE slowest way to travel.",
      },
      {
        word: "pricey",
        meaning: "expensive",
        example: "The Safari Campout is the priciest vacation option.",
      },
    ],
    contentSections: [
      {
        heading: "The sales pitch begins",
        paragraphs: [
          "Anna visits the World's Best Vacation Travel Agency, where Dan tries to sell her increasingly expensive trips. He starts with the Mountain Getaway, but Anna is afraid of heights.",
          "He moves to the Deep Sea Adventure, which is pricier. Anna imagines sharks and panics.",
        ],
      },
      {
        heading: "The ultimate vacation",
        paragraphs: [
          "Dan presents the Safari Campout as the priciest and best option. During the day, Anna would see elephants and giraffes; at night, she'd sleep under the stars.",
          "Anna is skeptical, but Dan reveals the Travel Max 2000—a machine that supposedly customizes vacations.",
        ],
      },
      {
        heading: "Anna's preferences",
        paragraphs: [
          "Anna describes her ideal travel: cozy and romantic but exciting. She prefers planes over helicopters, trains over ships, and definitely no bike tours.",
          "She explains that ships can be the scariest, and biking is the slowest and least romantic way to travel.",
        ],
      },
      {
        heading: "A fiery ending",
        paragraphs: [
          "The Travel Max 2000 catches fire during the demonstration. Dan is devastated, but Anna suggests he deserves a vacation—the Safari Campout.",
          "Dan refuses, still mourning his broken machine.",
        ],
      },
    ],
    exercises: [
      {
        id: "vacation-mcq-1",
        type: "mcq",
        prompt: "What is Dan's sales strategy?",
        options: [
          "He offers discounts on all vacations",
          "He presents increasingly expensive options",
          "He only shows budget-friendly trips",
          "He refuses to sell anything",
        ],
        answer: "He presents increasingly expensive options",
        skill: "Identify pattern",
        reference: "Sales pitch progression.",
      },
      {
        id: "vacation-tf-1",
        type: "trueFalse",
        prompt: "True or False: Anna loves bike tours.",
        answer: false,
        rationale: "She says biking is the slowest and least romantic way to travel.",
        skill: "Detail check",
        reference: "Anna's preferences section.",
      },
      {
        id: "vacation-short-1",
        type: "short",
        prompt: "List three comparative or superlative adjectives Anna uses to describe travel methods.",
        expected: ["scarier", "scariest", "slowest", "least romantic"],
        sampleAnswer: "Helicopters are scarier than planes; ships are the scariest; biking is the slowest.",
        skill: "Grammar recognition",
        reference: "Anna's preferences section.",
      },
      {
        id: "vacation-evidence-1",
        type: "evidence",
        prompt: "Explain how Dan uses language to persuade Anna. Give examples from the text.",
        expectedKeywords: ["better", "best", "pricier", "priciest", "comparative", "superlative"],
        guidance: "Show how he escalates from 'good' to 'better' to 'best'.",
        skill: "Analyze persuasion",
        reference: "Sales pitch sections.",
      },
    ],
  },
  {
    id: "will-it-float",
    title: "Will It Float?",
    subtitle: "A tour through Washington D.C. on a boat with wheels",
    cefr: "A2",
    genre: "Travel / Prepositions",
    source: "Voice of America – “Will It Float?”",
    tags: ["Travel", "Grammar", "Prepositions"],
    estimatedTime: 11,
    wordCount: 850,
    coverEmoji: "🚤",
    gradient: "linear-gradient(135deg,#a78bfa,#ec4899)",
    readingSkills: [
      "Identify prepositions of place",
      "Follow a tour narrative",
      "Recognize fun facts",
    ],
    keyIdeas: [
      "The DC Ducks is a boat that drives on roads and sails on water.",
      "A young boy shares fun facts about Washington D.C. landmarks.",
      "The tour passes famous buildings along the river and through the city.",
    ],
    vocabulary: [
      {
        word: "preposition",
        meaning: "word showing relationships (on, in, through, along)",
        example: "Anna says they'll ride through the city and along the river.",
      },
      {
        word: "aboard",
        meaning: "on or into a vehicle",
        example: "Anna tells Penelope to get aboard the DC Ducks.",
      },
      {
        word: "supplies",
        meaning: "materials needed for a purpose",
        example: "The boat was created to carry people and supplies during World War II.",
      },
    ],
    contentSections: [
      {
        heading: "A unique vehicle",
        paragraphs: [
          "Anna takes Penelope on a tour of Washington D.C. using the famous DC Ducks—a boat with wheels that can travel on roads and sail on water.",
          "Penelope is amazed that such a vehicle exists. Anna explains it was created during World War II.",
        ],
      },
      {
        heading: "The tour guide",
        paragraphs: [
          "A young boy joins them and offers to share fun facts. He explains that the Washington Monument was damaged in an earthquake.",
          "As they drive along the road, they see beautiful buildings. The Washington Monument appears on the left.",
        ],
      },
      {
        heading: "Near the White House",
        paragraphs: [
          "They pass across from the White House. The boy shares that inside the White House there are 32 bathrooms, a swimming pool, and a movie theater.",
          "Penelope and Anna decide to tip the boy for his excellent tour guide skills.",
        ],
      },
      {
        heading: "The question",
        paragraphs: [
          "Professor Bot asks viewers to predict: Will the boat go ON the river or INTO the river?",
          "The answer will be revealed in the next episode.",
        ],
      },
    ],
    exercises: [
      {
        id: "float-mcq-1",
        type: "mcq",
        prompt: "What makes the DC Ducks special?",
        options: [
          "It only travels on water",
          "It can drive on roads and sail on water",
          "It flies through the air",
          "It travels underground",
        ],
        answer: "It can drive on roads and sail on water",
        skill: "Main idea",
        reference: "Opening section.",
      },
      {
        id: "float-tf-1",
        type: "trueFalse",
        prompt: "True or False: The White House has 32 bathrooms.",
        answer: true,
        rationale: "The boy shares this fun fact during the tour.",
        skill: "Detail recall",
        reference: "Near the White House section.",
      },
      {
        id: "float-short-1",
        type: "short",
        prompt: "List three prepositions of place mentioned in the story.",
        expected: ["through", "along", "on", "across", "inside", "on the left"],
        sampleAnswer: "Through the city, along the river, on the left.",
        skill: "Grammar focus",
        reference: "Throughout the narrative.",
      },
      {
        id: "float-evidence-1",
        type: "evidence",
        prompt: "Describe the role of the young boy in the tour. What makes him a good guide?",
        expectedKeywords: ["fun facts", "helpful", "knowledgeable", "tip", "tour guide"],
        guidance: "Mention his enthusiasm and the information he provides.",
        skill: "Character analysis",
        reference: "The tour guide section.",
      },
    ],
  },
  {
    id: "tip-tour-guide",
    title: "Tip Your Tour Guide",
    subtitle: "Prepositions guide a tour through Washington D.C.",
    cefr: "A2",
    genre: "Travel / Grammar",
    source: "Voice of America – “Tip Your Tour Guide”",
    tags: ["Travel", "Prepositions", "Dialogue"],
    estimatedTime: 12,
    wordCount: 920,
    coverEmoji: "🗺️",
    gradient: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    readingSkills: [
      "Identify prepositions of place and movement",
      "Follow a narrative sequence",
      "Recognize landmarks",
    ],
    keyIdeas: [
      "The DC Ducks tour continues on and in the river.",
      "The boy shares fun facts about famous landmarks.",
      "Anna and Penelope discover the boy isn't the captain's son.",
    ],
    vocabulary: [
      {
        word: "over",
        meaning: "above or across",
        example: "Penelope loves riding over bridges.",
      },
      {
        word: "under",
        meaning: "below or beneath",
        example: "Anna prefers riding under a bridge in a boat.",
      },
      {
        word: "along",
        meaning: "following the length of",
        example: "They ride along railroad tracks.",
      },
    ],
    contentSections: [
      {
        heading: "On the river",
        paragraphs: [
          "The DC Ducks transitions from road to water. Anna is amazed that they're now riding in the river, not just along it.",
          "Penelope loves the view from the bridge, while Anna prefers being under bridges in a boat.",
        ],
      },
      {
        heading: "Landmarks and fun facts",
        paragraphs: [
          "They pass the Pentagon on the right. An airplane flies over their heads.",
          "The boy shares that there are tunnels under the U.S. Capitol connecting it to lawmakers' offices. They were built so lawmakers wouldn't have to walk outside in bad weather.",
        ],
      },
      {
        heading: "A creepy fact",
        paragraphs: [
          "Back at Union Station, the boy reveals a creepy fun fact: Many years ago, there was a funeral home inside Union Station.",
          "Anna is shocked, but the boy says he has to run.",
        ],
      },
      {
        heading: "The surprise",
        paragraphs: [
          "Anna thanks the captain and compliments his son's tour guiding skills. The captain is confused—he's never seen that boy before.",
          "Anna and Penelope realize they've been tipping a stranger who just happened to love fun facts!",
        ],
      },
    ],
    exercises: [
      {
        id: "tip-mcq-1",
        type: "mcq",
        prompt: "Why were tunnels built under the U.S. Capitol?",
        options: [
          "For secret meetings",
          "So lawmakers wouldn't have to walk outside in bad weather",
          "To hide treasure",
          "For security reasons only",
        ],
        answer: "So lawmakers wouldn't have to walk outside in bad weather",
        skill: "Detail comprehension",
        reference: "Landmarks section.",
      },
      {
        id: "tip-tf-1",
        type: "trueFalse",
        prompt: "True or False: The boy is the captain's son.",
        answer: false,
        rationale: "The captain says he's never seen that boy before.",
        skill: "Plot twist",
        reference: "The surprise section.",
      },
      {
        id: "tip-short-1",
        type: "short",
        prompt: "List four prepositions used to describe movement or position in this story.",
        expected: ["over", "under", "along", "in", "on", "by", "through"],
        sampleAnswer: "Over bridges, under the Capitol, along tracks, in the river.",
        skill: "Grammar recognition",
        reference: "Throughout the narrative.",
      },
      {
        id: "tip-evidence-1",
        type: "evidence",
        prompt: "Explain the irony at the end of the story. Why is it funny that Anna and Penelope tipped the boy?",
        expectedKeywords: ["stranger", "not the captain's son", "tipped", "fun facts"],
        guidance: "Describe what they assumed versus what was true.",
        skill: "Analyze irony",
        reference: "The surprise section.",
      },
    ],
  },
  {
    id: "pets-family",
    title: "Pets Are Family, Too!",
    subtitle: "Tag questions and pet contests at the state fair",
    cefr: "A2",
    genre: "Dialogue / Grammar",
    source: "Voice of America – “Pets Are Family, Too!”",
    tags: ["Pets", "Grammar", "Tag Questions"],
    estimatedTime: 11,
    wordCount: 880,
    coverEmoji: "🐕",
    gradient: "linear-gradient(135deg,#fda4af,#fb7185)",
    readingSkills: [
      "Recognize tag questions",
      "Follow a narrative about pets",
      "Identify grammar patterns",
    ],
    keyIdeas: [
      "Anna wins a pet contest with her pet rock.",
      "Tag questions are small questions at the end of sentences.",
      "Pets become part of the family.",
    ],
    vocabulary: [
      {
        word: "tag question",
        meaning: "small question at the end of a sentence",
        example: "You don't have a pet, do you?",
      },
      {
        word: "contest",
        meaning: "competition",
        example: "Anna enters the 'One-of-a-Kind Pet' contest.",
      },
      {
        word: "responsibility",
        meaning: "something you are expected to do",
        example: "Owning a dog is a big responsibility.",
      },
    ],
    contentSections: [
      {
        heading: "The state fair",
        paragraphs: [
          "Anna tells Ashley about winning first place at the D.C. State Fair. Ashley is confused because Anna doesn't have a pet—or does she?",
          "Anna explains there were many strange contests, including one for spitting watermelon seeds the farthest.",
        ],
      },
      {
        heading: "Meet Dublin",
        paragraphs: [
          "Ashley introduces her dog, Dublin. Anna meets him and asks if he has a costume or knows tricks.",
          "Dublin demonstrates catching a toy. Ashley says he could have won the Best Catch contest.",
        ],
      },
      {
        heading: "The pet rock",
        paragraphs: [
          "Anna reveals her 'pet' is actually a pet rock she's had since childhood. She entered it as a joke in the 'One-of-a-Kind Pet' contest and won!",
          "She shows Ashley her blue ribbon and describes seeing a little girl and her dog in matching princess costumes.",
        ],
      },
      {
        heading: "A new responsibility",
        paragraphs: [
          "Anna decides she wants a real dog. Ashley warns it's a big responsibility and suggests Anna spend time with a dog first.",
          "Ashley asks Anna to watch Dublin for a couple of hours while she shops. Anna happily agrees and takes Dublin's leash.",
        ],
      },
    ],
    exercises: [
      {
        id: "pets-mcq-1",
        type: "mcq",
        prompt: "What is Anna's 'pet'?",
        options: [
          "A real dog",
          "A pet rock",
          "A cat",
          "A bird",
        ],
        answer: "A pet rock",
        skill: "Main detail",
        reference: "The pet rock section.",
      },
      {
        id: "pets-tf-1",
        type: "trueFalse",
        prompt: "True or False: Ashley immediately gives Anna a dog.",
        answer: false,
        rationale: "She suggests Anna spend time with a dog first, then offers to let her watch Dublin.",
        skill: "Sequence",
        reference: "A new responsibility section.",
      },
      {
        id: "pets-short-1",
        type: "short",
        prompt: "Rewrite this sentence with a tag question: 'You haven't met my dog.'",
        expected: ["You haven't met my dog, have you?"],
        sampleAnswer: "You haven't met my dog, have you?",
        skill: "Grammar production",
        reference: "Tag question examples throughout.",
      },
      {
        id: "pets-evidence-1",
        type: "evidence",
        prompt: "Explain why Anna's pet rock winning a contest is ironic. Use details from the story.",
        expectedKeywords: ["pet rock", "joke", "won", "contest", "real pets"],
        guidance: "Contrast what people expect in a pet contest versus what Anna entered.",
        skill: "Analyze irony",
        reference: "The pet rock section.",
      },
    ],
  },
  {
    id: "mary-kay",
    title: "Mary Kay: A Leader in the Beauty Product Industry",
    subtitle: "From $5,000 investment to international success",
    cefr: "B1",
    genre: "Biography / Business",
    source: "VOA Learning English",
    tags: ["Business", "Women", "Success Story"],
    estimatedTime: 15,
    wordCount: 1200,
    coverEmoji: "💄",
    gradient: "linear-gradient(135deg,#f472b6,#ec4899)",
    readingSkills: [
      "Trace chronological events",
      "Identify business strategies",
      "Understand cause and effect",
    ],
    keyIdeas: [
      "Mary Kay started with $5,000 and built an international company.",
      "The company used direct sales through home demonstrations.",
      "Mary Kay created a system where experienced representatives trained new ones.",
    ],
    vocabulary: [
      {
        word: "investment",
        meaning: "money put into a business to make profit",
        example: "Mary Kay started with an investment of $5,000.",
      },
      {
        word: "representative",
        meaning: "person who sells products for a company",
        example: "Independent sales representatives bought products and sold them.",
      },
      {
        word: "stroke",
        meaning: "serious medical condition affecting the brain",
        example: "Mary Kay suffered a stroke in 1996.",
      },
    ],
    contentSections: [
      {
        heading: "Early life and challenges",
        paragraphs: [
          "Mary Kathlyn Wagner was born in Texas in 1918. As a child, she cared for her sick father while her mother worked long hours.",
          "She married at 17, had three children, and her husband left to serve in World War Two. When he returned, their marriage ended, and Mary Kay needed to support her children.",
        ],
      },
      {
        heading: "The beginning of a business",
        paragraphs: [
          "While selling products at a home party, Mary Kay tried homemade skin care products developed by J.W. Heath. She liked them and bought the rights for $500.",
          "In 1963, she started Mary Kay Cosmetics in Dallas, Texas, with the idea of selling through home demonstrations.",
        ],
      },
      {
        heading: "A successful model",
        paragraphs: [
          "The company grew quickly. By 1965, it was selling almost one million dollars in products.",
          "Mary Kay created a system where representatives who brought in new saleswomen received part of the new person's earnings. This encouraged experienced representatives to train newcomers.",
        ],
      },
      {
        heading: "Legacy and giving back",
        paragraphs: [
          "After her third husband died of cancer, Mary Kay started a foundation to support research on cancers affecting women.",
          "She worked until suffering a stroke in 1996 and died in 2001. Her company continues to operate internationally.",
        ],
      },
    ],
    exercises: [
      {
        id: "marykay-mcq-1",
        type: "mcq",
        prompt: "How did Mary Kay acquire the skin care products?",
        options: [
          "She developed them herself",
          "She bought the rights from J.W. Heath for $500",
          "She stole the formula",
          "She found them in a store",
        ],
        answer: "She bought the rights from J.W. Heath for $500",
        skill: "Detail recall",
        reference: "The beginning of a business section.",
      },
      {
        id: "marykay-tf-1",
        type: "trueFalse",
        prompt: "True or False: Mary Kay's company only operated in the United States.",
        answer: false,
        rationale: "The text states it continues to have sales offices in many different countries.",
        skill: "Global comprehension",
        reference: "A successful model section.",
      },
      {
        id: "marykay-short-1",
        type: "short",
        prompt: "Name two challenges Mary Kay faced in her early life.",
        expected: ["sick father", "divorce", "supporting children", "husband in war"],
        sampleAnswer: "She cared for her sick father and had to support her children after divorce.",
        skill: "Summarize challenges",
        reference: "Early life section.",
      },
      {
        id: "marykay-evidence-1",
        type: "evidence",
        prompt: "Explain how Mary Kay's training system helped the company grow. Use details from the text.",
        expectedKeywords: ["representatives", "train", "earnings", "experienced", "newcomers"],
        guidance: "Describe the incentive system and its benefits.",
        skill: "Analyze business model",
        reference: "A successful model section.",
      },
    ],
  },
  {
    id: "westminster-dog-show",
    title: "The Westminster Kennel Club Dog Show",
    subtitle: "The 'Super Bowl' of dog shows",
    cefr: "B1",
    genre: "News / Culture",
    source: "VOA Learning English",
    tags: ["Animals", "Competition", "Culture"],
    estimatedTime: 14,
    wordCount: 1100,
    coverEmoji: "🐕",
    gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)",
    readingSkills: [
      "Understand competition structure",
      "Identify historical context",
      "Compare events",
    ],
    keyIdeas: [
      "Monty the giant schnauzer won best in show at the 149th Westminster.",
      "The show dates back to 1877 and focuses on purebred judging.",
      "Westminster is considered the most important dog show in the U.S.",
    ],
    vocabulary: [
      {
        word: "breed",
        meaning: "particular kind of dog",
        example: "Monty became the first giant schnauzer to win best in show.",
      },
      {
        word: "finalist",
        meaning: "contestant in the final round",
        example: "Monty beat six other finalists.",
      },
      {
        word: "agility",
        meaning: "ability to move quickly and easily",
        example: "The organization has added agility events for mixed-breed dogs.",
      },
    ],
    contentSections: [
      {
        heading: "A historic win",
        paragraphs: [
          "At the 149th Westminster Kennel Club dog show, Monty the giant schnauzer won the top prize—best in show.",
          "This was the first time a giant schnauzer won this prestigious award. Monty had come close in previous years but finally succeeded.",
        ],
      },
      {
        heading: "The competition structure",
        paragraphs: [
          "Dogs first compete against others of their breed. Winners then compete within groups like sporting, working, toy, and herding.",
          "Group winners advance to the final round. The best in show winner receives a trophy but no money prize.",
        ],
      },
      {
        heading: "Historical significance",
        paragraphs: [
          "The Westminster show dates back to 1877 and is considered the Super Bowl of dog shows.",
          "In recent years, the organization has added agility and obedience events open to mixed-breed dogs, expanding beyond traditional purebred judging.",
        ],
      },
      {
        heading: "Recent winners",
        paragraphs: [
          "In 2024, Sage, a miniature poodle, won best in show. In 2023, Buddy Holly, a petit basset griffon Vendéen, took the top prize.",
          "Each winner becomes part of dog-world history.",
        ],
      },
    ],
    exercises: [
      {
        id: "dogshow-mcq-1",
        type: "mcq",
        prompt: "Why is Westminster called the 'Super Bowl' of dog shows?",
        options: [
          "It offers the biggest cash prizes",
          "It is the most important and respected competition",
          "It only allows purebred dogs",
          "It happens every month",
        ],
        answer: "It is the most important and respected competition",
        skill: "Metaphor understanding",
        reference: "Historical significance section.",
      },
      {
        id: "dogshow-tf-1",
        type: "trueFalse",
        prompt: "True or False: The best in show winner receives a large cash prize.",
        answer: false,
        rationale: "The text states the top prize does not include money.",
        skill: "Detail check",
        reference: "Competition structure section.",
      },
      {
        id: "dogshow-short-1",
        type: "short",
        prompt: "List the three stages of competition at Westminster.",
        expected: ["breed competition", "group competition", "final round"],
        sampleAnswer: "First dogs compete within their breed, then within groups, then in the final round.",
        skill: "Sequence understanding",
        reference: "Competition structure section.",
      },
      {
        id: "dogshow-evidence-1",
        type: "evidence",
        prompt: "Explain how Westminster has evolved over time. Use evidence from the text.",
        expectedKeywords: ["1877", "purebred", "agility", "obedience", "mixed-breed"],
        guidance: "Contrast traditional judging with recent additions.",
        skill: "Compare past and present",
        reference: "Historical significance section.",
      },
    ],
  },
  {
    id: "physical-therapists",
    title: "How Physical Therapists Can Prevent Future Health Problems",
    subtitle: "The best-kept secret in health care",
    cefr: "B2",
    genre: "Health / Science",
    source: "VOA Learning English",
    tags: ["Health", "Prevention", "Wellness"],
    estimatedTime: 16,
    wordCount: 1400,
    coverEmoji: "🏥",
    gradient: "linear-gradient(135deg,#60a5fa,#3b82f6)",
    readingSkills: [
      "Identify preventive health strategies",
      "Understand expert recommendations",
      "Compare costs and benefits",
    ],
    keyIdeas: [
      "Physical therapists can help prevent health problems, not just treat them.",
      "Yearly wellness visits can identify issues early.",
      "Physical therapists can help with fall prevention and weight management.",
    ],
    vocabulary: [
      {
        word: "postural",
        meaning: "relating to body position or posture",
        example: "Exams might uncover postural issues or unusual body movements.",
      },
      {
        word: "screen",
        meaning: "to test for possible medical conditions",
        example: "Physical therapists can screen children to see what sports suit them.",
      },
      {
        word: "milestone",
        meaning: "an important development or event",
        example: "Some people change based on a milestone like having a child.",
      },
    ],
    contentSections: [
      {
        heading: "A new perspective",
        paragraphs: [
          "Sharon Dunn, past president of the American Physical Therapy Association, calls physical therapists 'the best-kept secret in health care.'",
          "Experts say people should see physical therapists regularly, not just when recovering from injuries, to prevent future problems.",
        ],
      },
      {
        heading: "Following dental care's example",
        paragraphs: [
          "Gammon Earhart urges people to think about physical therapists like dentists—you visit even when nothing hurts.",
          "Yearly exams can include health history, activity levels, sleep, nutrition, and movement analysis to catch issues early.",
        ],
      },
      {
        heading: "Early screening for children",
        paragraphs: [
          "Physical therapists can screen children to see what sports or activities suit their body structure.",
          "Earhart notes that some children 'don't have the hips for ballet' and early screening could prevent future pain.",
        ],
      },
      {
        heading: "Fall prevention and weight management",
        paragraphs: [
          "Physical therapists help with fall prevention, especially for older adults. Exercises like 'floor to stand' movements improve flexibility and confidence.",
          "About half of physical therapy patients seek help with weight-related issues. Success often comes when people are motivated by life milestones.",
        ],
      },
    ],
    exercises: [
      {
        id: "pt-mcq-1",
        type: "mcq",
        prompt: "Why does Sharon Dunn call physical therapists 'the best-kept secret'?",
        options: [
          "They work in secret locations",
          "People don't realize they can prevent problems, not just treat them",
          "They only work at night",
          "They don't accept insurance",
        ],
        answer: "People don't realize they can prevent problems, not just treat them",
        skill: "Main idea",
        reference: "A new perspective section.",
      },
      {
        id: "pt-tf-1",
        type: "trueFalse",
        prompt: "True or False: Yearly physical therapy exams are always covered by insurance.",
        answer: false,
        rationale: "The text states yearly exams might not be covered by health insurance.",
        skill: "Detail check",
        reference: "Following dental care's example section.",
      },
      {
        id: "pt-short-1",
        type: "short",
        prompt: "Name two areas where physical therapists can help prevent problems.",
        expected: ["fall prevention", "weight management", "postural issues", "sports selection"],
        sampleAnswer: "Fall prevention for older adults and weight management.",
        skill: "Summarize",
        reference: "Fall prevention section.",
      },
      {
        id: "pt-evidence-1",
        type: "evidence",
        prompt: "Explain the comparison between physical therapists and dentists. Why is this comparison effective?",
        expectedKeywords: ["preventive", "regular visits", "even when nothing hurts", "early detection"],
        guidance: "Describe how both focus on prevention, not just treatment.",
        skill: "Analyze analogy",
        reference: "Following dental care's example section.",
      },
    ],
  },
  {
    id: "daylight-saving",
    title: "How Daylight Saving Time Affects Health",
    subtitle: "The impact of time changes on sleep and health",
    cefr: "B2",
    genre: "Health / Science",
    source: "VOA Learning English",
    tags: ["Health", "Sleep", "Science"],
    estimatedTime: 15,
    wordCount: 1300,
    coverEmoji: "⏰",
    gradient: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    readingSkills: [
      "Understand scientific explanations",
      "Identify health effects",
      "Follow recommendations",
    ],
    keyIdeas: [
      "Daylight saving time changes can disrupt circadian rhythms.",
      "Studies show increases in heart attacks and car crashes after time changes.",
      "Experts recommend preparing gradually for the time change.",
    ],
    vocabulary: [
      {
        word: "circadian rhythm",
        meaning: "the body's 24-hour cycle regulating sleep and wakefulness",
        example: "Morning light resets the circadian rhythm.",
      },
      {
        word: "hormone",
        meaning: "chemical produced by the body that affects functions",
        example: "Melatonin is a hormone that increases in the evening.",
      },
      {
        word: "clot",
        meaning: "when blood becomes a solid mass",
        example: "Blood is more likely to clot in the morning.",
      },
    ],
    contentSections: [
      {
        heading: "The time change",
        paragraphs: [
          "Much of the United States 'springs forward' in March for daylight saving time. This change can leave people tired and may harm health.",
          "Some studies show increases in heart attacks and strokes right after the March time change.",
        ],
      },
      {
        heading: "How the brain's clock works",
        paragraphs: [
          "The brain has a circadian rhythm set by exposure to sunlight and darkness. This roughly 24-hour cycle governs when we become sleepy.",
          "Morning light resets the rhythm. By evening, melatonin levels increase, leading to tiredness. Too much light in the evening delays this cycle.",
        ],
      },
      {
        heading: "Health effects",
        paragraphs: [
          "Sleep deprivation is linked to heart disease, weight problems, and thinking issues.",
          "Deadly car crashes increase in the first few days after the spring time change. The American Heart Association points to studies suggesting increases in heart attacks on the Monday after daylight saving begins.",
        ],
      },
      {
        heading: "How to prepare",
        paragraphs: [
          "Experts recommend moving bedtimes 15-20 minutes earlier for several nights before the change. Go outside for early morning sunshine the first week.",
          "Start daily activities like dinner or exercise a little earlier to help the body adjust.",
        ],
      },
    ],
    exercises: [
      {
        id: "dst-mcq-1",
        type: "mcq",
        prompt: "What is the circadian rhythm?",
        options: [
          "A type of clock",
          "The body's 24-hour cycle regulating sleep and wakefulness",
          "A hormone",
          "A sleep disorder",
        ],
        answer: "The body's 24-hour cycle regulating sleep and wakefulness",
        skill: "Definition",
        reference: "How the brain's clock works section.",
      },
      {
        id: "dst-tf-1",
        type: "trueFalse",
        prompt: "True or False: Car crashes decrease after daylight saving time begins.",
        answer: false,
        rationale: "The text states deadly car crash numbers increase after the spring time change.",
        skill: "Detail comprehension",
        reference: "Health effects section.",
      },
      {
        id: "dst-short-1",
        type: "short",
        prompt: "List two ways to prepare for daylight saving time.",
        expected: ["move bedtime earlier", "get morning sunshine", "start activities earlier"],
        sampleAnswer: "Move bedtime 15-20 minutes earlier and get early morning sunshine.",
        skill: "Recall recommendations",
        reference: "How to prepare section.",
      },
      {
        id: "dst-evidence-1",
        type: "evidence",
        prompt: "Explain how daylight saving time affects the circadian rhythm. Use scientific details from the text.",
        expectedKeywords: ["circadian rhythm", "light", "melatonin", "delays", "cycle"],
        guidance: "Describe the relationship between light, hormones, and sleep cycles.",
        skill: "Explain scientific process",
        reference: "How the brain's clock works section.",
      },
    ],
  },
  {
    id: "wright-brothers",
    title: "Wilbur and Orville Wright: The First Airplane",
    subtitle: "The birth of modern flight",
    cefr: "B2",
    genre: "History / Science",
    source: "VOA Learning English",
    tags: ["History", "Science", "Innovation"],
    estimatedTime: 17,
    wordCount: 1500,
    coverEmoji: "✈️",
    gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)",
    readingSkills: [
      "Follow chronological narrative",
      "Understand scientific process",
      "Identify historical significance",
    ],
    keyIdeas: [
      "The Wright brothers made the first engine-powered flight in 1903.",
      "They tested their ideas at Kitty Hawk, North Carolina.",
      "Their achievement changed the world and began the modern age of flight.",
    ],
    vocabulary: [
      {
        word: "glider",
        meaning: "a flying object similar to an airplane but without an engine",
        example: "The Wright brothers did many tests with gliders at Kitty Hawk.",
      },
      {
        word: "sandbar",
        meaning: "a ridge of sand in shallow water",
        example: "Crane's ship hit a sandbar and sank.",
      },
      {
        word: "demonstration",
        meaning: "a showing of how something works",
        example: "Wilbur gave demonstration flights at heights of 90 meters.",
      },
    ],
    contentSections: [
      {
        heading: "Early experiments",
        paragraphs: [
          "Wilbur Wright was born in 1867 in Indiana, and his brother Orville was born four years later in Ohio.",
          "As they grew up, the brothers experimented with mechanical things. They used ideas from toy helicopters, kites, printing machines, and bicycles.",
        ],
      },
      {
        heading: "Testing at Kitty Hawk",
        paragraphs: [
          "They needed a place to test their ideas about flight. They chose Kill Devil Hill near Kitty Hawk, North Carolina, for its excellent wind conditions.",
          "The brothers did many tests with gliders, learning how to solve problems of flight.",
        ],
      },
      {
        heading: "The first flight",
        paragraphs: [
          "By autumn 1903, they had built an airplane powered by a gasoline engine. The plane had wings 12 meters across and weighed about 340 kilograms.",
          "On December 17, 1903, Orville flew the plane 36 meters and was in the air for 12 seconds. They made three more flights that day.",
        ],
      },
      {
        heading: "Recognition and legacy",
        paragraphs: [
          "It was almost five years before the Wright brothers became famous. In 1908, Wilbur gave demonstration flights in France, and Orville made successful flights in the United States.",
          "The United States War Department agreed to buy a Wright brothers' plane. Today, their first airplane is in the Air and Space Museum in Washington, D.C.",
        ],
      },
    ],
    exercises: [
      {
        id: "wright-mcq-1",
        type: "mcq",
        prompt: "Why did the Wright brothers choose Kitty Hawk for testing?",
        options: [
          "It was close to their home",
          "It had excellent wind conditions",
          "It had the best hotels",
          "It was the cheapest location",
        ],
        answer: "It had excellent wind conditions",
        skill: "Detail recall",
        reference: "Testing at Kitty Hawk section.",
      },
      {
        id: "wright-tf-1",
        type: "trueFalse",
        prompt: "True or False: The Wright brothers became famous immediately after their first flight.",
        answer: false,
        rationale: "The text states it was almost five years before they became famous.",
        skill: "Timeline",
        reference: "Recognition and legacy section.",
      },
      {
        id: "wright-short-1",
        type: "short",
        prompt: "Describe the first successful flight on December 17, 1903.",
        expected: ["36 meters", "12 seconds", "Orville", "first flight"],
        sampleAnswer: "Orville flew the plane 36 meters and was in the air for 12 seconds.",
        skill: "Summarize event",
        reference: "The first flight section.",
      },
      {
        id: "wright-evidence-1",
        type: "evidence",
        prompt: "Explain how the Wright brothers' background in mechanics helped them build the first airplane. Use details from the text.",
        expectedKeywords: ["experimented", "mechanical", "helicopters", "kites", "bicycles", "gliders"],
        guidance: "Describe how their early experiments contributed to their success.",
        skill: "Trace development",
        reference: "Early experiments and Testing sections.",
      },
    ],
  },
  {
    id: "open-boat-part-one",
    title: "'The Open Boat' by Stephen Crane, Part One",
    subtitle: "Four men fight for survival in a small lifeboat",
    cefr: "C1",
    genre: "Literature / Adventure",
    source: "VOA Learning English - American Stories",
    tags: ["Literature", "Survival", "Classic"],
    estimatedTime: 20,
    wordCount: 1800,
    coverEmoji: "🌊",
    gradient: "linear-gradient(135deg,#0ea5e9,#3b82f6)",
    readingSkills: [
      "Analyze literary techniques",
      "Understand symbolism",
      "Identify themes of survival",
    ],
    keyIdeas: [
      "Four men struggle to survive in a small lifeboat after their ship sinks.",
      "The story is based on Crane's real experience in 1896.",
      "The men work together, forming a brotherhood on the sea.",
    ],
    vocabulary: [
      {
        word: "sandbar",
        meaning: "a ridge of sand in shallow water",
        example: "Crane's ship hit a sandbar and sank in the Atlantic Ocean.",
      },
      {
        word: "oar",
        meaning: "a long pole with a flat blade used for rowing",
        example: "The boat had only two wooden oars.",
      },
      {
        word: "brotherhood",
        meaning: "a feeling of friendship and unity",
        example: "A brotherhood of men was established on the sea.",
      },
    ],
    contentSections: [
      {
        heading: "The shipwreck",
        paragraphs: [
          "In 1896, Stephen Crane was traveling to Cuba as a newspaper reporter when his ship hit a sandbar and sank off the coast of Florida.",
          "Most people got into lifeboats, but Crane was among the last to leave. He climbed into the only remaining lifeboat with three others: the ship's captain, the cook, and a sailor named Billie.",
        ],
      },
      {
        heading: "Fighting the waves",
        paragraphs: [
          "The small lifeboat bounced from wave to wave in rough seas. The waves rose so high the men could not see the sky.",
          "Each man thought each wave would be his last. The boat had only two thin wooden oars. Billie directed the boat's movement with one oar, and the reporter pulled the second.",
        ],
      },
      {
        heading: "The captain's leadership",
        paragraphs: [
          "The captain lay in the front of the boat, hurt when the ship sank. His face was sad, but he looked carefully ahead and told Billie when to turn the boat.",
          "He asked if they had much of a chance, then said, 'We'll get ashore all right.' But there was something in his voice that made them think otherwise.",
        ],
      },
      {
        heading: "Seeing land",
        paragraphs: [
          "Hours passed. Then, as the boat was carried to the top of a great wave, the captain saw the lighthouse at Mosquito Inlet.",
          "The lighthouse grew larger, and soon the men could see land—a black line of trees and a white line of sand. They heard the sound of waves breaking on the shore.",
        ],
      },
    ],
    exercises: [
      {
        id: "openboat1-mcq-1",
        type: "mcq",
        prompt: "What is the main conflict in Part One?",
        options: [
          "A fight between the men",
          "The struggle to survive in a small boat against the sea",
          "A search for treasure",
          "A race to reach land first",
        ],
        answer: "The struggle to survive in a small boat against the sea",
        skill: "Identify conflict",
        reference: "Throughout the narrative.",
      },
      {
        id: "openboat1-tf-1",
        type: "trueFalse",
        prompt: "True or False: The story is based on Crane's real experience.",
        answer: true,
        rationale: "The text states Crane was traveling to Cuba in 1896 when his ship sank.",
        skill: "Author's background",
        reference: "The shipwreck section.",
      },
      {
        id: "openboat1-short-1",
        type: "short",
        prompt: "Describe the 'brotherhood' that forms among the four men.",
        expected: ["friendship", "unity", "working together", "shared experience"],
        sampleAnswer: "The men develop a deep friendship and unity as they work together to survive.",
        skill: "Analyze theme",
        reference: "Fighting the waves section.",
      },
      {
        id: "openboat1-evidence-1",
        type: "evidence",
        prompt: "Analyze how Crane uses imagery to describe the power of the sea. Give specific examples.",
        expectedKeywords: ["waves", "white tops", "angry violence", "mountainous", "foam", "snow"],
        guidance: "Describe the visual and emotional impact of the sea imagery.",
        skill: "Literary analysis",
        reference: "Fighting the waves section.",
      },
    ],
  },
  {
    id: "eagle-eyes",
    title: "Don't Miss a Thing With 'Eagle Eyes'",
    subtitle: "Expressions about seeing and observing",
    cefr: "C1",
    genre: "Words & Their Stories",
    source: "VOA Learning English",
    tags: ["Idioms", "Vocabulary", "Expressions"],
    estimatedTime: 14,
    wordCount: 1200,
    coverEmoji: "👁️",
    gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
    readingSkills: [
      "Understand idiomatic expressions",
      "Recognize figurative language",
      "Apply expressions in context",
    ],
    keyIdeas: [
      "'Bird's eye view' means seeing from above or getting an overall perspective.",
      "'Eagle eye' and 'hawk-eyed' describe people who notice everything.",
      "These expressions come from the keen vision of birds of prey.",
    ],
    vocabulary: [
      {
        word: "raptor",
        meaning: "a bird of prey like an eagle or hawk",
        example: "Raptors have powerful binocular vision.",
      },
      {
        word: "binocular",
        meaning: "involving two eyes",
        example: "Raptors have powerful binocular vision.",
      },
      {
        word: "perceive",
        meaning: "to understand or notice",
        example: "Eagle-eyed people may perceive things others miss.",
      },
    ],
    contentSections: [
      {
        heading: "Bird's eye view",
        paragraphs: [
          "From above, birds have a wonderful view of the world. In English, we use 'bird's eye view' to describe a view from above or an overall perspective.",
          "When starting a project, it's helpful to get a bird's eye view by asking big picture questions about goals and resources.",
        ],
      },
      {
        heading: "The vision of raptors",
        paragraphs: [
          "Eagles, hawks, and owls can see their prey from very far away. They have powerful binocular vision and special bone structure around their eyes.",
          "Their ability to focus on faraway details makes them extremely effective hunters.",
        ],
      },
      {
        heading: "Eagle-eyed and hawk-eyed",
        paragraphs: [
          "If you have an 'eagle eye,' you notice everything, even very small details others might miss.",
          "Someone who is 'hawk-eyed' watches and notices everything that happens. Both terms describe observant, perceptive people.",
        ],
      },
      {
        heading: "Using the expressions",
        paragraphs: [
          "These abilities might be used only at certain times. For example, hawk-eyed children might search the sky for Santa Claus during Christmastime.",
          "The term 'eagle eye' has been used for hundreds of years, first appearing in writing in the mid-1500s.",
        ],
      },
    ],
    exercises: [
      {
        id: "eagle-mcq-1",
        type: "mcq",
        prompt: "What does 'bird's eye view' mean?",
        options: [
          "Seeing like a bird",
          "A view from above or an overall perspective",
          "A very close view",
          "A blurry view",
        ],
        answer: "A view from above or an overall perspective",
        skill: "Idiom comprehension",
        reference: "Bird's eye view section.",
      },
      {
        id: "eagle-tf-1",
        type: "trueFalse",
        prompt: "True or False: 'Eagle eye' and 'hawk-eyed' mean the same thing.",
        answer: true,
        rationale: "Both describe people who are observant and notice everything.",
        skill: "Compare meanings",
        reference: "Eagle-eyed section.",
      },
      {
        id: "eagle-short-1",
        type: "short",
        prompt: "Explain why raptors have such good vision.",
        expected: ["binocular vision", "bone structure", "focus", "hunt"],
        sampleAnswer: "They have powerful binocular vision and special bone structure that protects their eyes and helps them focus on distant prey.",
        skill: "Scientific explanation",
        reference: "Vision of raptors section.",
      },
      {
        id: "eagle-evidence-1",
        type: "evidence",
        prompt: "Describe a situation where someone might use their 'eagle eyes.' Give a specific example.",
        expectedKeywords: ["notice", "details", "observe", "perceptive", "watch"],
        guidance: "Create a realistic scenario showing keen observation.",
        skill: "Apply expression",
        reference: "Using the expressions section.",
      },
    ],
  },
  {
    id: "watching-grass-grow",
    title: "'Watching the Grass Grow' Is Not Fun",
    subtitle: "Expressions about boredom and activity",
    cefr: "B2",
    genre: "Words & Their Stories",
    source: "VOA Learning English",
    tags: ["Idioms", "Expressions", "Vocabulary"],
    estimatedTime: 12,
    wordCount: 1000,
    coverEmoji: "🌱",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    readingSkills: [
      "Understand idiomatic expressions",
      "Recognize figurative language",
      "Apply expressions in context",
    ],
    keyIdeas: [
      "'Like watching grass grow' means something is very boring.",
      "'Don't let grass grow under your feet' means to stay active and not waste time.",
      "These expressions use grass as a metaphor for time and activity.",
    ],
    vocabulary: [
      {
        word: "tedious",
        meaning: "tiresome because it takes a long time and is repetitive",
        example: "Watching grass grow is tedious.",
      },
      {
        word: "on-the-go",
        meaning: "having much high-spirited energy and movement",
        example: "People who are always on-the-go don't let grass grow under their feet.",
      },
      {
        word: "beneath",
        meaning: "under or below",
        example: "Don't let the grass grow beneath your feet.",
      },
    ],
    contentSections: [
      {
        heading: "A boring experience",
        paragraphs: [
          "Springtime brings renewal and growth. Grass grows thicker and greener, but you can't really see it happening.",
          "Imagine sitting in a grassy field with only one job—to watch the grass grow. That sounds really boring.",
        ],
      },
      {
        heading: "The expression",
        paragraphs: [
          "This idea gives us the expression 'like watching grass grow.' We use it to describe an experience that is uninteresting or tedious.",
          "For example, a two-hour acceptance speech can be as much fun as watching grass grow.",
        ],
      },
      {
        heading: "Staying active",
        paragraphs: [
          "For people who are always active and moving, we say they 'don't let grass grow under their feet.'",
          "This expression can also be used as a command: 'Don't let the grass grow beneath your feet. Get back to work!'",
        ],
      },
      {
        heading: "Using the expressions",
        paragraphs: [
          "These expressions are common in everyday English. They use grass as a metaphor for time and activity.",
          "Someone who doesn't let grass grow under their feet is always busy and productive.",
        ],
      },
    ],
    exercises: [
      {
        id: "grass-mcq-1",
        type: "mcq",
        prompt: "What does 'like watching grass grow' mean?",
        options: [
          "Something is very interesting",
          "Something is very boring or tedious",
          "Something grows quickly",
          "Something is beautiful",
        ],
        answer: "Something is very boring or tedious",
        skill: "Idiom comprehension",
        reference: "The expression section.",
      },
      {
        id: "grass-tf-1",
        type: "trueFalse",
        prompt: "True or False: 'Don't let grass grow under your feet' means to be lazy.",
        answer: false,
        rationale: "It means to stay active and not waste time.",
        skill: "Idiom comprehension",
        reference: "Staying active section.",
      },
      {
        id: "grass-short-1",
        type: "short",
        prompt: "Give an example of when you might say something is 'like watching grass grow.'",
        expected: ["boring", "tedious", "slow", "uninteresting"],
        sampleAnswer: "Waiting in a long line at the DMV is like watching grass grow.",
        skill: "Apply expression",
        reference: "Using the expressions section.",
      },
      {
        id: "grass-evidence-1",
        type: "evidence",
        prompt: "Explain the metaphor behind these grass expressions. How does grass represent time and activity?",
        expectedKeywords: ["metaphor", "time", "activity", "growth", "slow"],
        guidance: "Describe how grass growing slowly represents boredom, and preventing grass growth represents staying active.",
        skill: "Analyze metaphor",
        reference: "Throughout the lesson.",
      },
    ],
  },
];

