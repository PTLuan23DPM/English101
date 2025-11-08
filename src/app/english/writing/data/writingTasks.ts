export interface WritingTask {
    id: string;
    icon: string;
    title: string;
    type: string;
    level: string;
    prompt: string;
    targetWords: string;
    tips: string[];
    recommended?: boolean;
    attempts: number;
    color: string;
}

export const WRITING_TASKS: WritingTask[] = [
    // Sentence Building
    {
        id: "sentence-daily",
        icon: "📝",
        title: "Daily Routine",
        type: "Sentence Building",
        level: "A2",
        prompt: "Write 5-7 sentences about your daily morning routine. Use simple present tense and time expressions.",
        targetWords: "50-80 words",
        tips: [
            "Use time expressions: in the morning, at 7 AM, after breakfast",
            "Use simple present tense: I wake up, I have breakfast",
            "Connect sentences with: then, after that, finally",
        ],
        recommended: true,
        attempts: 0,
        color: "blue",
    },
    {
        id: "sentence-weekend",
        icon: "☀️",
        title: "Weekend Activities",
        type: "Sentence Building",
        level: "A2",
        prompt: "Describe what you usually do on weekends. Write 5-7 complete sentences.",
        targetWords: "50-80 words",
        tips: [
            "Use frequency adverbs: usually, sometimes, often",
            "Mention different activities",
            "Use linking words to connect ideas",
        ],
        attempts: 0,
        color: "blue",
    },
    // Paragraph Writing
    {
        id: "para-hobby",
        icon: "🎨",
        title: "My Favorite Hobby",
        type: "Paragraph Writing",
        level: "B1",
        prompt: "Describe your favorite hobby and explain why you enjoy it. Include details about how you got started and what you have learned.",
        targetWords: "100-150 words",
        tips: [
            "Start with a topic sentence introducing your hobby",
            "Use specific examples and details",
            "End with a concluding sentence",
        ],
        recommended: true,
        attempts: 0,
        color: "green",
    },
    {
        id: "para-travel",
        icon: "✈️",
        title: "A Memorable Trip",
        type: "Paragraph Writing",
        level: "B1",
        prompt: "Write about a memorable trip or vacation. Describe where you went, what you did, and why it was special.",
        targetWords: "120-150 words",
        tips: [
            "Use past tense to describe events",
            "Include sensory details (what you saw, heard, felt)",
            "Explain why this experience was meaningful",
        ],
        attempts: 0,
        color: "green",
    },
    // Email Writing
    {
        id: "email-formal",
        icon: "📧",
        title: "Extension Request",
        type: "Email Writing",
        level: "B1",
        prompt: "Write a formal email to your professor requesting an extension for your assignment. Explain your situation politely.",
        targetWords: "120-180 words",
        tips: [
            "Start with: Dear Professor [Name],",
            "Be polite and professional",
            "End with: Best regards, [Your name]",
        ],
        attempts: 0,
        color: "purple",
    },
    {
        id: "email-complaint",
        icon: "💼",
        title: "Product Complaint",
        type: "Email Writing",
        level: "B2",
        prompt: "Write a formal complaint email to a company about a defective product you purchased. Request a refund or replacement.",
        targetWords: "150-200 words",
        tips: [
            "State the problem clearly",
            "Include relevant details (order number, date)",
            "Be firm but polite",
            "Clearly state what you want",
        ],
        attempts: 0,
        color: "purple",
    },
    // Essay Writing - Task 2 Types
    {
        id: "essay-discussion",
        icon: "💬",
        title: "Work From Home vs Office",
        type: "Discussion",
        level: "B2",
        prompt: "Some people prefer to work from home, while others prefer to work in an office. Discuss both views and give your opinion.",
        targetWords: "250-300 words",
        tips: [
            "Introduction: state the topic and your thesis",
            "Body paragraph 1: advantages of working from home",
            "Body paragraph 2: advantages of office work",
            "Conclusion: summarize and state your opinion",
        ],
        recommended: true,
        attempts: 0,
        color: "teal",
    },
    {
        id: "essay-advantage",
        icon: "⚖️",
        title: "Online Shopping",
        type: "Advantage-Disadvantage",
        level: "B2",
        prompt: "Online shopping is becoming increasingly popular. Discuss the advantages and disadvantages of buying products online.",
        targetWords: "250-300 words",
        tips: [
            "Introduction: introduce the topic",
            "Body 1: discuss advantages with examples",
            "Body 2: discuss disadvantages with examples",
            "Conclusion: balanced summary",
        ],
        recommended: true,
        attempts: 0,
        color: "teal",
    },
    {
        id: "essay-opinion",
        icon: "📊",
        title: "University Education",
        type: "Opinion",
        level: "B2",
        prompt: "Some people believe university education should be free for all students. To what extent do you agree or disagree?",
        targetWords: "250-300 words",
        tips: [
            "Introduction: clearly state your position",
            "Body: provide 2-3 main arguments",
            "Use examples and evidence",
            "Conclusion: restate your opinion",
        ],
        attempts: 0,
        color: "teal",
    },
    {
        id: "essay-problem",
        icon: "🌍",
        title: "Environmental Pollution",
        type: "Problem-Solution",
        level: "C1",
        prompt: "Environmental pollution is a growing concern. What are the main causes of this problem and what solutions can you suggest?",
        targetWords: "250-300 words",
        tips: [
            "Introduction: present the problem",
            "Body 1: discuss main causes",
            "Body 2: propose practical solutions",
            "Conclusion: summarize key points",
        ],
        attempts: 0,
        color: "teal",
    },
    {
        id: "essay-two-part",
        icon: "❓",
        title: "Technology and Children",
        type: "Multi-Part",
        level: "B2",
        prompt: "Many children spend several hours per day on screens. Why is this the case? What are the effects on their development?",
        targetWords: "250-300 words",
        tips: [
            "Introduction: acknowledge both questions",
            "Body 1: answer first question (reasons)",
            "Body 2: answer second question (effects)",
            "Conclusion: brief summary",
        ],
        attempts: 0,
        color: "teal",
    },
];

